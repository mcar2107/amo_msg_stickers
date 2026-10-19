import { CUSTOM_PACK_ID } from '@core/db';
import type { SendItem } from '@core/db.types';
import { itemKey, RECENT_LIMIT } from '@core/itemKey';
import { isAllowedUrl } from '@core/net';
import { SET_NAME_RE } from '@core/sources';
import { isDimension, isObject } from '@shared/guards';

import {
  clampGraphemes,
  FORMAT_NAME,
  FORMAT_VERSION,
  MAX_CAPTION_GRAPHEMES,
  MAX_EMOJI_GRAPHEMES,
  MAX_FILE_FAVORITES,
  MAX_FILE_STICKERS,
  MAX_GIF_ID_LENGTH,
  MAX_SET_NAME_LENGTH,
  MAX_TITLE_GRAPHEMES,
  MAX_URL_LENGTH,
} from './limits';

/**
 * Префикс id пака и стикера Telegram. Свой, а не `TG_ID_PREFIX` из `sources/telegram.ts`: тот модуль тянет
 * конвертацию с кодом Worker-а, а гард нужен и выгрузке, и чтению без неё.
 */
const TELEGRAM_PREFIX = 'tg:';

/**
 * Id стикера Telegram — `tg:` и `file_unique_id`, как его пишет импорт из Telegram.
 */
const TELEGRAM_STICKER_ID_RE = /^tg:[\w-]{1,64}$/;

/**
 * Id своего стикера — base36 из `uid()` без префикса: свой стикер не может занять id стикера Telegram, и наоборот.
 */
const CUSTOM_STICKER_ID_RE = /^[a-z0-9]{1,32}$/;

/**
 * Откуда пак: импорт из Telegram или свои стикеры.
 */
export type ManifestSource = 'telegram' | 'custom';

export type ManifestSticker = {
  /**
   * Id стикера в библиотеке: у стикера Telegram — `tg:<file_unique_id>`, у своего — base36 без префикса.
   */
  id: string;

  /**
   * Путь GIF стикера в архиве от каталога описания.
   */
  file: string;

  /**
   * Эмодзи стикера, урезанный до предела формата. undefined — эмодзи нет.
   */
  emoji?: string;

  /**
   * Подпись своего стикера, урезанная до предела формата. undefined — подписи нет.
   */
  caption?: string;
};

export type ManifestPack = {
  /**
   * Id пака: `custom` или `tg:<имя набора>`.
   */
  id: string;

  /**
   * Откуда пак; согласован с id.
   */
  source: ManifestSource;

  /**
   * Название пака, урезанное до предела формата.
   */
  title: string;

  /**
   * Имя набора Telegram — только у пака Telegram и равно имени из id. undefined — у пака нет «Копировать ссылку».
   */
  sourceRef?: string;

  /**
   * Время добавления пака (мс) — есть только в выгрузке библиотеки.
   */
  createdAt?: number;

  /**
   * Время последнего использования пака (мс) — есть только в выгрузке библиотеки и только у использованного пака.
   */
  usedAt?: number;

  /**
   * Стикер-обложка — всегда один из `stickers` этого пака. undefined — обложкой станет первый стикер.
   */
  coverId?: string;

  /**
   * Стикеры в порядке пака; хотя бы один.
   */
  stickers: ManifestSticker[];
};

/**
 * GIF из поиска — то, что нужно для её показа и отправки.
 */
export type ManifestGif = {
  /**
   * Сервис, из поиска которого пришла GIF.
   */
  provider: 'giphy' | 'klipy';

  /**
   * Id GIF у источника, до `MAX_GIF_ID_LENGTH` символов.
   */
  id: string;

  /**
   * Название GIF, урезанное до предела формата. undefined — названия нет.
   */
  title?: string;

  /**
   * Ссылка на GIF для отправки — `https` на хост сетевой политики.
   */
  url: string;

  /**
   * Ссылка на превью для ленты — `https` на хост сетевой политики.
   */
  previewUrl: string;

  /**
   * Ширина GIF в пикселях.
   */
  width: number;

  /**
   * Высота GIF в пикселях.
   */
  height: number;
};

/**
 * Стикер раздела, который лежит в одном из паков файла.
 */
export type ManifestStickerRef = {
  /**
   * Вид элемента.
   */
  kind: 'sticker';

  /**
   * Id стикера одного из паков файла.
   */
  id: string;

  /**
   * Время добавления в избранное или последней отправки (мс).
   */
  ts: number;
};

/**
 * Избранный стикер со своим GIF: в библиотеке его нет, и в паки файла он не попал.
 */
export type ManifestStickerSnapshot = ManifestStickerRef & {
  /**
   * Путь GIF стикера в архиве от каталога описания.
   */
  file: string;

  /**
   * Пак, к которому принадлежал стикер: `custom` или `tg:<имя набора>`, того же вида, что id стикера.
   */
  packId: string;

  /**
   * Эмодзи стикера, урезанный до предела формата. undefined — эмодзи нет.
   */
  emoji?: string;

  /**
   * Подпись своего стикера, урезанная до предела формата. undefined — подписи нет.
   */
  caption?: string;
};

/**
 * GIF из поиска в разделе.
 */
export type ManifestGifItem = {
  /**
   * Вид элемента.
   */
  kind: 'gif';

  /**
   * Время добавления в избранное или последней отправки (мс).
   */
  ts: number;

  /**
   * Данные GIF.
   */
  gif: ManifestGif;
};

export type ManifestFavorite =
  ManifestStickerRef | ManifestStickerSnapshot | ManifestGifItem;

export type ManifestRecent = ManifestStickerRef | ManifestGifItem;

export type LibraryManifest = {
  /**
   * Признак формата.
   */
  format: typeof FORMAT_NAME;

  /**
   * Версия формата файла, `1…FORMAT_VERSION`.
   */
  version: number;

  /**
   * Паки в порядке файла — порядке ленты на момент выгрузки; без пустых паков.
   */
  packs: ManifestPack[];

  /**
   * Избранное, от новых к старым; ссылки только на стикеры паков файла. undefined — избранного в файле нет.
   */
  favorites?: ManifestFavorite[];

  /**
   * Недавние обоих видов от новых к старым, не больше `RECENT_LIMIT` каждого вида; стикеры — только из паков файла.
   * undefined — недавних в файле нет.
   */
  recent?: ManifestRecent[];
};

/**
 * @param item — элемент избранного
 * @returns true — стикер несёт свой GIF
 */
export const isManifestSnapshot = (
  item: ManifestFavorite
): item is ManifestStickerSnapshot => {
  return 'file' in item;
};

/**
 * Элемент раздела как элемент библиотеки: по нему `itemKey` даёт тот же ключ, что у избранного и недавних базы.
 *
 * @param item — элемент избранного или недавних
 * @returns стикер библиотеки или GIF из поиска
 */
export const toSendItem = (item: ManifestFavorite | ManifestRecent): SendItem => {
  switch (item.kind) {
    case 'sticker': {
      return { kind: 'local', stickerId: item.id };
    }

    case 'gif': {
      return { kind: 'remote', gif: item.gif };
    }

    default: {
      throw new Error(`Неизвестный вид элемента: ${String(item satisfies never)}`);
    }
  }
};

/**
 * Почему описание не принято:
 *
 * - `notOurs` — не описание amo stickers (нет признака формата);
 * - `tooNew` — версия формата новее той, что знает эта сборка;
 * - `invalid` — нарушены поля, их типы, id или повторы;
 * - `tooBig` — стикеров (вместе со снимками избранного) больше `MAX_FILE_STICKERS` или избранного больше
 *   `MAX_FILE_FAVORITES`;
 * - `empty` — ни одного стикера, избранного и недавнего.
 */
export type ManifestError = 'notOurs' | 'tooNew' | 'invalid' | 'tooBig' | 'empty';

/**
 * Итог разбора описания: описание после проверок и урезания строк или причина отказа.
 */
export type ManifestParse =
  | {
      /**
       * Описание, приведённое к пределам формата.
       */
      manifest: LibraryManifest;
    }
  | {
      /**
       * Причина отказа.
       */
      error: ManifestError;
    };

/**
 * Поле чужого объекта: только собственное, без цепочки прототипов.
 *
 * @param value — объект из JSON
 * @param key — имя поля
 * @returns значение поля; undefined — поля нет
 */
const field = (value: object, key: string): unknown => {
  return Object.hasOwn(value, key) ? Reflect.get(value, key) : undefined;
};

/**
 * Необязательная строка, урезанная до предела. Пустая после урезания — то же, что отсутствие.
 *
 * @param value — объект из JSON
 * @param key — имя поля
 * @param maxGraphemes — предел в графемах
 * @returns строка; undefined — поля нет или оно пустое; null — поле не строка
 */
const optionalText = (value: object, key: string, maxGraphemes: number) => {
  const raw = field(value, key);

  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') return null;

  return clampGraphemes(raw, maxGraphemes) || undefined;
};

/**
 * Необязательное время: конечное неотрицательное число.
 *
 * @param value — объект из JSON
 * @param key — имя поля
 * @returns время; undefined — поля нет; null — поле не время
 */
const optionalTime = (value: object, key: string) => {
  const raw = field(value, key);

  if (raw === undefined) return undefined;

  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : null;
};

/**
 * Обязательное время элемента раздела.
 *
 * @param value — элемент из JSON
 * @returns время; null — поля нет или оно не время
 */
const requiredTime = (value: object) => {
  const ts = optionalTime(value, 'ts');

  return ts === undefined ? null : ts;
};

/**
 * Id стикера по источнику пака: свой стикер не может занять id стикера Telegram, и наоборот.
 */
const STICKER_ID_RE: Record<ManifestSource, RegExp> = {
  telegram: TELEGRAM_STICKER_ID_RE,
  custom: CUSTOM_STICKER_ID_RE,
};

/**
 * @param id — id пака
 * @returns true — `tg:` и имя набора по правилу имени Telegram
 */
const isTelegramPackId = (id: string) => {
  const name = id.slice(TELEGRAM_PREFIX.length);

  return (
    id.startsWith(TELEGRAM_PREFIX) &&
    name.length <= MAX_SET_NAME_LENGTH &&
    SET_NAME_RE.test(name)
  );
};

/**
 * @param id — id пака из JSON
 * @returns источник пака по id; null — id не пака amo stickers
 */
const sourceOfPackId = (id: unknown): ManifestSource | null => {
  if (id === CUSTOM_PACK_ID) return 'custom';

  return typeof id === 'string' && isTelegramPackId(id) ? 'telegram' : null;
};

/**
 * @param value — стикер из JSON
 * @param source — источник его пака: от него зависит вид id
 * @returns стикер; null — нарушены поля или id не того вида
 */
const parseSticker = (value: unknown, source: ManifestSource): ManifestSticker | null => {
  if (!isObject(value)) return null;
  const id = field(value, 'id');
  const file = field(value, 'file');

  if (typeof id !== 'string' || !STICKER_ID_RE[source].test(id)) return null;
  if (typeof file !== 'string' || !file) return null;
  const emoji = optionalText(value, 'emoji', MAX_EMOJI_GRAPHEMES);
  const caption = optionalText(value, 'caption', MAX_CAPTION_GRAPHEMES);

  if (emoji === null || caption === null) return null;

  return {
    id,
    file,
    ...(emoji === undefined ? {} : { emoji }),
    ...(caption === undefined ? {} : { caption }),
  };
};

/**
 * Источник пака, согласованный с его id. `sourceRef` у своего пака не нужен и не переносится; у пака Telegram он
 * необязателен, но если есть — равен имени набора из id.
 *
 * @param value — пак из JSON
 * @param id — id пака
 * @returns источник и имя набора; null — источник неизвестен или не согласован с id
 */
const parseSource = (value: object, id: string) => {
  const source = field(value, 'source');

  switch (source) {
    case 'custom': {
      return id === CUSTOM_PACK_ID ? { source, sourceRef: undefined } : null;
    }

    case 'telegram': {
      const sourceRef = field(value, 'sourceRef');

      if (!isTelegramPackId(id)) return null;

      if (sourceRef !== undefined && sourceRef !== id.slice(TELEGRAM_PREFIX.length)) {
        return null;
      }

      return { source, sourceRef };
    }

    default: {
      return null;
    }
  }
};

/**
 * Обложка, которая не указывает на стикер этого пака, отбрасывается без ошибки: у пака Telegram обложкой мог быть
 * удалённый стикер.
 *
 * @param value — пак из JSON
 * @returns пак; null — нарушены поля, источник или стикеры
 */
const parsePack = (value: unknown): ManifestPack | null => {
  if (!isObject(value)) return null;
  const id = field(value, 'id');
  const title = field(value, 'title');
  const rawStickers = field(value, 'stickers');
  const coverId = field(value, 'coverId');

  if (typeof id !== 'string' || typeof title !== 'string') return null;
  if (!Array.isArray(rawStickers)) return null;
  if (coverId !== undefined && typeof coverId !== 'string') return null;
  const origin = parseSource(value, id);
  const createdAt = optionalTime(value, 'createdAt');
  const usedAt = optionalTime(value, 'usedAt');

  if (!origin || createdAt === null || usedAt === null) return null;
  const { source, sourceRef } = origin;
  const stickers: ManifestSticker[] = [];

  for (const raw of rawStickers) {
    const sticker = parseSticker(raw, source);

    if (!sticker) return null;
    stickers.push(sticker);
  }

  const hasCover = stickers.some((sticker) => {
    return sticker.id === coverId;
  });

  return {
    id,
    source,
    title: clampGraphemes(title, MAX_TITLE_GRAPHEMES),
    ...(sourceRef === undefined ? {} : { sourceRef }),
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(usedAt === undefined ? {} : { usedAt }),
    ...(hasCover && coverId !== undefined ? { coverId } : {}),
    stickers,
  };
};

/**
 * Ссылка GIF из файла: по ней пикер ходит в сеть, поэтому — только адрес сетевой политики.
 *
 * @param value — GIF из JSON
 * @param key — имя поля
 * @returns ссылка; null — не строка, длиннее предела или вне политики
 */
const allowedUrl = (value: object, key: string) => {
  const url = field(value, key);

  return typeof url === 'string' && url.length <= MAX_URL_LENGTH && isAllowedUrl(url)
    ? url
    : null;
};

/**
 * @param value — GIF из JSON
 * @returns GIF; null — нарушены поля
 */
const parseGif = (value: unknown): ManifestGif | null => {
  if (!isObject(value)) return null;
  const provider = field(value, 'provider');
  const id = field(value, 'id');
  const title = optionalText(value, 'title', MAX_TITLE_GRAPHEMES);
  const url = allowedUrl(value, 'url');
  const previewUrl = allowedUrl(value, 'previewUrl');
  const width = field(value, 'width');
  const height = field(value, 'height');

  if (provider !== 'giphy' && provider !== 'klipy') return null;
  if (typeof id !== 'string' || !id || id.length > MAX_GIF_ID_LENGTH) return null;
  if (title === null || url === null || previewUrl === null) return null;
  if (!isDimension(width) || !isDimension(height)) return null;

  return {
    provider,
    id,
    ...(title === undefined ? {} : { title }),
    url,
    previewUrl,
    width,
    height,
  };
};

/**
 * @param value — элемент раздела из JSON
 * @param ts — его время
 * @returns GIF раздела; null — нарушены поля GIF
 */
const parseGifItem = (value: object, ts: number): ManifestGifItem | null => {
  const gif = parseGif(field(value, 'gif'));

  return gif ? { kind: 'gif', ts, gif } : null;
};

/**
 * Ссылка на стикер принимается с id любого вида: есть ли стикер в паках файла, проверяется после разбора паков.
 *
 * @param value — элемент раздела из JSON
 * @param ts — его время
 * @returns ссылка на стикер; null — id не стикера amo stickers
 */
const parseStickerRef = (value: object, ts: number): ManifestStickerRef | null => {
  const id = field(value, 'id');

  if (typeof id !== 'string') return null;
  if (!TELEGRAM_STICKER_ID_RE.test(id) && !CUSTOM_STICKER_ID_RE.test(id)) return null;

  return { kind: 'sticker', id, ts };
};

/**
 * @param value — элемент избранного из JSON
 * @param ts — его время
 * @returns стикер со своим GIF; null — нарушены поля или вид id стикера не тот, что у пака
 */
const parseSnapshot = (value: object, ts: number): ManifestStickerSnapshot | null => {
  const packId = field(value, 'packId');
  const source = sourceOfPackId(packId);

  if (!source || typeof packId !== 'string') return null;
  const sticker = parseSticker(value, source);

  if (!sticker) return null;
  const { id, file, emoji, caption } = sticker;

  return {
    kind: 'sticker',
    id,
    ts,
    file,
    packId,
    ...(emoji === undefined ? {} : { emoji }),
    ...(caption === undefined ? {} : { caption }),
  };
};

/**
 * Новый вид элемента — ошибка, а не пропуск: его принесёт только новая версия формата.
 *
 * @param value — элемент избранного из JSON
 * @returns элемент избранного; null — нарушены поля или вид
 */
const parseFavorite = (value: unknown): ManifestFavorite | null => {
  if (!isObject(value)) return null;
  const ts = requiredTime(value);

  if (ts === null) return null;
  const kind = field(value, 'kind');

  switch (kind) {
    case 'sticker': {
      return field(value, 'file') === undefined
        ? parseStickerRef(value, ts)
        : parseSnapshot(value, ts);
    }

    case 'gif': {
      return parseGifItem(value, ts);
    }

    default: {
      return null;
    }
  }
};

/**
 * Недавний стикер своего GIF не несёт: стикер, которого нет в паках, не показывается в недавних и не переносится.
 *
 * @param value — недавний элемент из JSON
 * @returns недавний элемент; null — нарушены поля или вид
 */
const parseRecent = (value: unknown): ManifestRecent | null => {
  if (!isObject(value)) return null;
  const ts = requiredTime(value);

  if (ts === null) return null;
  const kind = field(value, 'kind');

  switch (kind) {
    case 'sticker': {
      return parseStickerRef(value, ts);
    }

    case 'gif': {
      return parseGifItem(value, ts);
    }

    default: {
      return null;
    }
  }
};

/**
 * Раздел целиком: один нарушенный элемент — ошибка файла.
 *
 * @param raw — раздел из JSON
 * @param parseItem — разбор элемента
 * @returns элементы в порядке файла, пустой массив — раздела нет; null — раздел не массив или элемент нарушен
 */
const parseSection = <T>(raw: unknown, parseItem: (value: unknown) => T | null) => {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  const items: T[] = [];

  for (const value of raw) {
    const item = parseItem(value);

    if (item === null) return null;
    items.push(item);
  }

  return items;
};

/**
 * Число стикеров в описании до разбора полей: предел проверяется раньше, чем разбирается каждый стикер. Избранный
 * стикер со своим GIF — тоже стикер файла.
 *
 * @param packs — паки из JSON
 * @param favorites — избранное из JSON
 * @returns сумма длин массивов `stickers` и число элементов избранного с `file`
 */
const countStickers = (packs: unknown[], favorites: unknown) => {
  const packStickers = packs.reduce<number>((total, pack) => {
    const stickers = isObject(pack) ? field(pack, 'stickers') : undefined;

    return total + (Array.isArray(stickers) ? stickers.length : 0);
  }, 0);

  if (!Array.isArray(favorites)) return packStickers;

  return favorites.reduce<number>((total, item) => {
    return isObject(item) && field(item, 'file') !== undefined ? total + 1 : total;
  }, packStickers);
};

/**
 * Повторы пака, стикера или ссылки на один GIF во всём файле — ошибка: иначе один GIF лёг бы под двумя id, а стикер —
 * в два пака. Избранный стикер со своим GIF — в тех же множествах: стикер, который есть в паке файла, своего GIF не
 * несёт.
 *
 * @param packs — разобранные паки
 * @param favorites — разобранное избранное
 * @returns true — повторов нет
 */
const isUnique = (packs: ManifestPack[], favorites: ManifestFavorite[]) => {
  const packIds = new Set<string>();
  const stickerIds = new Set<string>();
  const files = new Set<string>();

  /**
   * @param sticker — стикер пака или снимок избранного
   * @returns true — ни id, ни GIF ещё не заняты
   */
  const take = ({ id, file }: Pick<ManifestSticker, 'id' | 'file'>) => {
    if (stickerIds.has(id) || files.has(file)) return false;
    stickerIds.add(id);
    files.add(file);

    return true;
  };

  for (const { id, stickers } of packs) {
    if (packIds.has(id)) return false;
    packIds.add(id);

    for (const sticker of stickers) {
      if (!take(sticker)) return false;
    }
  }

  for (const item of favorites) {
    if (isManifestSnapshot(item) && !take(item)) return false;
  }

  return true;
};

/**
 * Повтор элемента в разделе — ошибка: в библиотеке элемент лежит в разделе один раз, и повтор значит, что описание
 * правили руками или оно повреждено.
 *
 * @param items — элементы раздела
 * @returns true — ключи элементов не повторяются
 */
const hasUniqueKeys = (items: (ManifestFavorite | ManifestRecent)[]) => {
  const keys = new Set<string>();

  for (const item of items) {
    const key = itemKey(toSendItem(item));

    if (keys.has(key)) return false;
    keys.add(key);
  }

  return true;
};

/**
 * Стикеры без своего GIF вне паков файла отбрасываются без ошибки — как обложка не из пака: файл собран из библиотеки,
 * где такой стикер уже удалён.
 *
 * @param item — элемент раздела
 * @param stickerIds — id стикеров паков файла
 * @returns true — элемент переносится
 */
const isKept = (item: ManifestFavorite, stickerIds: ReadonlySet<string>) => {
  return item.kind === 'gif' || isManifestSnapshot(item) || stickerIds.has(item.id);
};

/**
 * Недавних каждого вида — не больше, чем держит библиотека; остаются самые поздние по времени, а не первые по массиву:
 * порядок файла не доверенный.
 *
 * @param recent — недавние после разбора
 * @param stickerIds — id стикеров паков файла
 * @returns недавние от новых к старым, без стикеров вне паков файла
 */
const keptRecent = (recent: ManifestRecent[], stickerIds: ReadonlySet<string>) => {
  const counts: Record<ManifestRecent['kind'], number> = { sticker: 0, gif: 0 };
  const byTime = [...recent].sort((a, b) => {
    return b.ts - a.ts;
  });

  return byTime.reduce<ManifestRecent[]>((acc, item) => {
    if (!isKept(item, stickerIds) || counts[item.kind] >= RECENT_LIMIT) return acc;
    counts[item.kind] += 1;
    acc.push(item);

    return acc;
  }, []);
};

/**
 * Разбирает описание файла amo stickers. Им же выгрузка проверяет своё описание до сборки архива: выгрузка не может
 * сохранить то, чего не прочитает.
 *
 * Строки длиннее предела урезаются, неизвестные поля игнорируются, обложка не из стикеров пака отбрасывается, пустые
 * паки выбрасываются. Избранное и недавние — без стикеров вне паков файла, недавних — не больше `RECENT_LIMIT`
 * каждого вида; раздела без элементов в описании нет. Ссылки `file` на записи архива здесь не проверяются — только
 * то, что это непустая строка без повторов.
 *
 * @param value — `manifest.json` после `JSON.parse`
 * @returns описание в пределах формата или причина отказа
 */
export const parseManifest = (value: unknown): ManifestParse => {
  if (!isObject(value) || field(value, 'format') !== FORMAT_NAME) {
    return { error: 'notOurs' };
  }

  const version = field(value, 'version');
  const rawPacks = field(value, 'packs');

  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
    return { error: 'invalid' };
  }

  if (version > FORMAT_VERSION) return { error: 'tooNew' };
  const rawFavorites = field(value, 'favorites');

  if (!Array.isArray(rawPacks)) return { error: 'invalid' };
  if (countStickers(rawPacks, rawFavorites) > MAX_FILE_STICKERS)
    return { error: 'tooBig' };

  if (Array.isArray(rawFavorites) && rawFavorites.length > MAX_FILE_FAVORITES) {
    return { error: 'tooBig' };
  }

  const parsedPacks: ManifestPack[] = [];

  for (const raw of rawPacks) {
    const pack = parsePack(raw);

    if (!pack) return { error: 'invalid' };
    parsedPacks.push(pack);
  }

  const parsedFavorites = parseSection(rawFavorites, parseFavorite);
  const parsedRecent = parseSection(field(value, 'recent'), parseRecent);

  if (!parsedFavorites || !parsedRecent) return { error: 'invalid' };

  /**
   * Повторы — до отбрасывания пустых паков и ссылок без стикера: пустой повтор пака или повтор ссылки тоже значит, что
   * описание правили руками или оно повреждено.
   */
  if (
    !isUnique(parsedPacks, parsedFavorites) ||
    !hasUniqueKeys(parsedFavorites) ||
    !hasUniqueKeys(parsedRecent)
  ) {
    return { error: 'invalid' };
  }

  const packs = parsedPacks.filter(({ stickers }) => {
    return stickers.length > 0;
  });
  const stickerIds = new Set(
    packs.flatMap(({ stickers }) => {
      return stickers.map(({ id }) => {
        return id;
      });
    })
  );
  const favorites = parsedFavorites.filter((item) => {
    return isKept(item, stickerIds);
  });
  const recent = keptRecent(parsedRecent, stickerIds);

  if (!packs.length && !favorites.length && !recent.length) return { error: 'empty' };

  return {
    manifest: {
      format: FORMAT_NAME,
      version,
      packs,
      ...(favorites.length ? { favorites } : {}),
      ...(recent.length ? { recent } : {}),
    },
  };
};
