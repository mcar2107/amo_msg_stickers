import { isObject } from '../../shared/guards';
import { CUSTOM_PACK_ID } from '../db';
import { SET_NAME_RE } from '../sources/telegram.types';

import {
  clampGraphemes,
  FORMAT_NAME,
  FORMAT_VERSION,
  MAX_CAPTION_GRAPHEMES,
  MAX_EMOJI_GRAPHEMES,
  MAX_FILE_STICKERS,
  MAX_TITLE_GRAPHEMES,
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
};

/**
 * Почему описание не принято:
 *
 * - `notOurs` — не описание amo stickers (нет признака формата);
 * - `tooNew` — версия формата новее той, что знает эта сборка;
 * - `invalid` — нарушены поля, их типы, id или повторы;
 * - `tooBig` — стикеров больше `MAX_FILE_STICKERS`;
 * - `empty` — ни одного стикера.
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
 * @param value — стикер из JSON
 * @param source — источник его пака: от него зависит вид id
 * @returns стикер; null — нарушены поля или id не того вида
 */
const parseSticker = (value: unknown, source: ManifestSource): ManifestSticker | null => {
  if (!isObject(value)) return null;
  const id = field(value, 'id');
  const file = field(value, 'file');
  const idPattern = source === 'telegram' ? TELEGRAM_STICKER_ID_RE : CUSTOM_STICKER_ID_RE;

  if (typeof id !== 'string' || !idPattern.test(id)) return null;
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
      const name = id.slice(TELEGRAM_PREFIX.length);
      const sourceRef = field(value, 'sourceRef');

      if (!id.startsWith(TELEGRAM_PREFIX) || !SET_NAME_RE.test(name)) return null;
      if (sourceRef !== undefined && sourceRef !== name) return null;

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
 * Число стикеров в описании до разбора полей: предел проверяется раньше, чем разбирается каждый стикер.
 *
 * @param packs — паки из JSON
 * @returns сумма длин массивов `stickers`
 */
const countStickers = (packs: unknown[]) => {
  return packs.reduce<number>((total, pack) => {
    const stickers = isObject(pack) ? field(pack, 'stickers') : undefined;

    return total + (Array.isArray(stickers) ? stickers.length : 0);
  }, 0);
};

/**
 * Повторы пака, стикера или ссылки на один GIF во всём файле — ошибка: иначе один GIF лёг бы под двумя id, а стикер —
 * в два пака.
 *
 * @param packs — разобранные паки
 * @returns true — повторов нет
 */
const isUnique = (packs: ManifestPack[]) => {
  const packIds = new Set<string>();
  const stickerIds = new Set<string>();
  const files = new Set<string>();

  for (const { id, stickers } of packs) {
    if (packIds.has(id)) return false;
    packIds.add(id);

    for (const sticker of stickers) {
      if (stickerIds.has(sticker.id) || files.has(sticker.file)) return false;
      stickerIds.add(sticker.id);
      files.add(sticker.file);
    }
  }

  return true;
};

/**
 * Разбирает описание файла amo stickers. Им же выгрузка проверяет своё описание до сборки архива: выгрузка не может
 * сохранить то, чего не прочитает.
 *
 * Строки длиннее предела урезаются, неизвестные поля игнорируются, обложка не из стикеров пака отбрасывается, пустые
 * паки выбрасываются. Ссылки `file` на записи архива здесь не проверяются — только то, что это непустая строка без
 * повторов.
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
  if (!Array.isArray(rawPacks)) return { error: 'invalid' };
  if (countStickers(rawPacks) > MAX_FILE_STICKERS) return { error: 'tooBig' };
  const parsedPacks: ManifestPack[] = [];

  for (const raw of rawPacks) {
    const pack = parsePack(raw);

    if (!pack) return { error: 'invalid' };
    parsedPacks.push(pack);
  }

  /**
   * Повторы — до отбрасывания пустых паков: пустой повтор пака тоже значит, что описание правили руками или оно
   * повреждено.
   */
  if (!isUnique(parsedPacks)) return { error: 'invalid' };
  const packs = parsedPacks.filter(({ stickers }) => {
    return stickers.length > 0;
  });

  if (!packs.length) return { error: 'empty' };

  return { manifest: { format: FORMAT_NAME, version, packs } };
};
