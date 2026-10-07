import { BUILTIN_TELEGRAM_TOKEN } from '../builtinToken';
import { toStickerGif } from '../convert';
import type { SourceKind } from '../convert.types';
import {
  deletePack,
  deleteSticker,
  getPack,
  listStickers,
  putPack,
  putSticker,
  setPackCover,
} from '../db';
import type { Pack, StickerRec } from '../db.types';
import type { Host } from '../host.types';
import { LocalizedError, t } from '../i18n/translate';
import { BYTES_IN_MB, httpStatus } from '../net';

import {
  type ImportProgress,
  isTgFile,
  isTgResponse,
  isTgSticker,
  isTgStickerSet,
  type PreviewOutcome,
  SET_NAME_RE,
  type TgSticker,
  type TgStickerSet,
} from './telegram.types';

/**
 * Импорт пака через Telegram Bot API.
 * Нужен токен любого бота — свой из @BotFather или встроенный в сборку: getStickerSet
 * работает для публичных паков.
 */

const TG_API = 'https://api.telegram.org';

/**
 * Префикс id пака и стикера: отделяет импорт из Telegram от своих стикеров в одной базе.
 */
export const TG_ID_PREFIX = 'tg:';

/**
 * У Telegram статичные стикеры до 512 КБ, `.tgs` до 64 КБ, видео до 256 КБ; лимит — с
 * запасом на изменение этих правил.
 */
const MAX_STICKER_FILE_BYTES = 5 * BYTES_IN_MB;

/**
 * Ошибка создаётся на каждый отказ, а не хранится готовой: текст берётся на языке интерфейса в момент
 * отказа, а модуль вычисляется раньше, чем `start()` выставит язык.
 *
 * @returns ошибка ответа не по форме Bot API
 */
const badResponse = () => {
  return new Error(t('error.source.badResponse', { source: 'Telegram' }));
};

/**
 * Отказ бота, а не запроса: 401 — токен недействителен, 429 — бот упёрся в лимит запросов.
 * На встроенном токене пользователь их не исправит, а свой токен — исправит. 403 Bot API
 * отдаёт, когда пользователь заблокировал бота, — к импорту он не относится.
 */
const BOT_REFUSAL_STATUSES = [401, 429];

/**
 * Отказ встроенному боту подменяется подсказкой про свой токен: текст ответа Telegram
 * («Unauthorized», «Too Many Requests») не говорит, что делать. Прочие ошибки — пак не
 * найден, сеть, лимит размера — остаются как есть.
 *
 * @param error — ошибка запроса к Bot API со встроенным токеном
 * @returns ошибка недоступности встроенного бота или исходная ошибка
 */
const toBuiltinError = (error: unknown): unknown => {
  const status = httpStatus(error);

  if (status === null || !BOT_REFUSAL_STATUSES.includes(status)) return error;

  return new LocalizedError('error.telegram.builtinUnavailable');
};

/**
 * Отказ встроенного бота касается всего пака, а не одного стикера: следующие запросы уйдут с
 * тем же отозванным токеном или в тот же лимит общего бота.
 *
 * @param error — ошибка импорта стикера
 * @returns `true` — встроенный бот недоступен
 */
const isBuiltinUnavailable = (error: unknown) => {
  return (
    error instanceof LocalizedError && error.key === 'error.telegram.builtinUnavailable'
  );
};

/**
 * Запрос к Bot API или его файлам: на встроенном токене отказ бота становится подсказкой про
 * свой токен.
 *
 * @param request — запрос
 * @param isBuiltin — запрос идёт со встроенным токеном
 * @returns результат запроса
 */
const guardBuiltin = async <T>(request: Promise<T>, isBuiltin: boolean): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    throw isBuiltin ? toBuiltinError(error) : error;
  }
};

/**
 * Форма токена Bot API — `<id бота>:<секрет>`, та же, что проверяет сборка для встроенного
 * токена.
 */
const BOT_TOKEN_RE = /^\d+:[\w-]+$/;

/**
 * Проверка только формы, без запроса к Telegram: ловит вставку не того значения, а не
 * отозванный токен. Пробелы по краям не мешают — настройки сохраняются без них.
 *
 * @param token — токен из поля настроек
 * @returns `true` — похоже на токен бота
 */
export const isBotTokenFormat = (token: string): boolean => {
  return BOT_TOKEN_RE.test(token.trim());
};

const SET_LINK_RE = /(?:t\.me|telegram\.me)\/(?:addstickers|addemoji)\/([A-Za-z0-9_]+)/;

export const parseSetName = (input: string): string | null => {
  const trimmed = input.trim();
  const [, name] = trimmed.match(SET_LINK_RE) || [];

  if (name) return name;

  return SET_NAME_RE.test(trimmed) ? trimmed : null;
};

/**
 * Отказ метода в ответе Bot API (`ok: false`), а не сбой запроса: его отличает исход превью —
 * Telegram сам сказал, что не так.
 */
class BotApiRefusal extends Error {}

/**
 * Вызов метода Bot API. Возвращает `result` без проверки формы: её проверяет гард метода.
 *
 * @param host — окружение
 * @param token — токен бота
 * @param method — метод Bot API
 * @param params — параметры запроса
 * @returns `result` ответа
 */
const call = async (
  host: Host,
  token: string,
  method: string,
  params: Record<string, string>
) => {
  const response = await host.fetchJson(
    `${TG_API}/bot${token}/${method}?${new URLSearchParams(params)}`
  );

  if (!isTgResponse(response)) throw badResponse();
  const { ok, result, description } = response;

  if (!ok) {
    throw new BotApiRefusal(description || t('error.telegram.methodFailed', { method }));
  }

  return result;
};

const toSourceKind = ({
  is_animated: isAnimated,
  is_video: isVideo,
}: TgSticker): SourceKind => {
  if (isAnimated) return 'tgs';

  return isVideo ? 'video' : 'image';
};

/**
 * Telegram отдаёт файлы без осмысленного MIME, а декодеру картинок и видео тип нужен.
 * TGS остаётся как есть: его распознаёт Lottie, а не браузер.
 */
const withMimeType = (raw: Blob, kind: SourceKind): Blob => {
  switch (kind) {
    case 'image': {
      return new Blob([raw], { type: 'image/webp' });
    }

    case 'video': {
      return new Blob([raw], { type: 'video/webm' });
    }

    case 'tgs': {
      return raw;
    }

    default: {
      throw new Error(`Unknown source kind: ${String(kind)}`);
    }
  }
};

/**
 * Токен запросов к Bot API: свой токен пользователя важнее встроенного — со своим отказ бота
 * показывается текстом ответа Telegram.
 *
 * @param ownToken — свой токен из настроек; пустой — встроенный токен сборки
 * @returns токен и признак встроенного
 */
const pickToken = (ownToken: string) => {
  const token = ownToken || BUILTIN_TELEGRAM_TOKEN;

  if (!token) throw new Error(t('error.telegram.noToken'));

  return { token, isBuiltin: !ownToken };
};

/**
 * Состав пака без записи в библиотеку: им показывают карточку пака до импорта, и он же уходит в
 * импорт. Битая ссылка и отсутствие токена — ошибка без запроса к Telegram.
 *
 * @param host — окружение
 * @param ownToken — свой токен из настроек; пустой — встроенный токен сборки
 * @param input — ссылка на пак или имя набора
 * @returns набор пака; отказ встроенного бота — подсказка про свой токен
 */
export const resolveTelegramSet = async (
  host: Host,
  ownToken: string,
  input: string
): Promise<TgStickerSet> => {
  const name = parseSetName(input);

  if (!name) throw new Error(t('error.telegram.badLink'));
  const { token, isBuiltin } = pickToken(ownToken);
  const set = await guardBuiltin(call(host, token, 'getStickerSet', { name }), isBuiltin);

  if (!isTgStickerSet(set)) throw badResponse();

  return set;
};

/**
 * Пак не найден — HTTP 400 или отказ в ответе Bot API: пользователь исправит ссылку до
 * импорта. Остальное — отказ встроенного бота, сеть, битый ответ — превью не показывает, но
 * импорт не блокирует: он покажет свою ошибку сам.
 *
 * @param error — ошибка `resolveTelegramSet`
 * @returns исход превью
 */
export const previewOutcome = (error: unknown): PreviewOutcome => {
  if (error instanceof BotApiRefusal || httpStatus(error) === 400) return 'notFound';

  return 'noPreview';
};

/**
 * Откат отменённого импорта: нового пака не остаётся вместе со стикерами, а пак, импортированный
 * раньше, возвращается к записи и составу до начала. Стикеры сверяются со снимком, а не считаются
 * последними N: стикер, записанный в момент отмены, тоже уходит. Повтор перезаписывает стикеры
 * пака по тому же id с новым `createdAt`, поэтому стикер из снимка возвращается к прежней записи —
 * иначе после отмены изменился бы порядок пака.
 *
 * @param packId — id пака
 * @param previous — запись пака до импорта; undefined — пака не было
 * @param snapshot — записи стикеров пака до импорта по id
 */
const rollbackImport = async (
  packId: string,
  previous: Pack | undefined,
  snapshot: Map<string, StickerRec>
) => {
  if (!previous) {
    await deletePack(packId);

    return;
  }

  await putPack(previous);

  for (const { id } of await listStickers(packId)) {
    const before = snapshot.get(id);

    await (before ? putSticker(before) : deleteSticker(id));
  }
};

/**
 * Импортирует в библиотеку пак по уже полученному набору (`resolveTelegramSet`): состав
 * пака повторно не запрашивается. Токен выбирается так же, как у набора.
 *
 * Отмена проверяется перед каждым запросом, конвертацией и записью стикера: запрос в полёте не
 * обрывается, но его ответ отбрасывается. Отменённый импорт откатывается до броска.
 *
 * @param host — окружение
 * @param ownToken — свой токен из настроек; пустой — импорт встроенным токеном сборки
 * @param set — набор пака
 * @param onProgress — прогресс по стикерам
 * @param signal — отмена импорта; undefined — без неё
 * @returns пак, в который импортирован хотя бы один стикер; отказ встроенного бота посреди пака —
 *   исключение, а уже импортированные стикеры остаются в библиотеке; отмена — `signal.reason`,
 *   библиотека как до импорта
 */
export const importTelegramSet = async (
  host: Host,
  ownToken: string,
  set: TgStickerSet,
  onProgress: (p: ImportProgress) => void,
  signal?: AbortSignal
): Promise<Pack> => {
  signal?.throwIfAborted();
  const { token, isBuiltin } = pickToken(ownToken);
  const { name: setName, title, stickers } = set;

  const startedAt = Date.now();
  const packId = `${TG_ID_PREFIX}${setName}`;
  const previous = await getPack(packId);

  /**
   * Повторный импорт берёт `createdAt` и `usedAt` прежней записи: место пака в порядке не меняется, в том числе у
   * пака без использования. Новый пак отмечен использованным временем импорта — он встаёт первым среди паков Telegram.
   */
  const pack: Pack = {
    id: packId,
    title,
    source: 'telegram',
    sourceRef: setName,
    createdAt: previous?.createdAt || startedAt,
  };
  const usedAt = previous ? previous.usedAt : startedAt;

  if (usedAt) pack.usedAt = usedAt;

  /**
   * Снимок до записи пака: у нового пака откат удаляет его целиком, и снимок не нужен.
   */
  const snapshot = new Map<string, StickerRec>();

  if (previous) {
    for (const sticker of await listStickers(pack.id)) snapshot.set(sticker.id, sticker);
  }

  await putPack(pack);

  const total = stickers.length;

  onProgress({ done: 0, total, title });

  let done = 0;

  /**
   * Причина первого отказа: если не импортируется ни один стикер, пользователь видит её, а не общее
   * «нет пригодных стикеров» — лимит размера или сеть подсказывают, что делать. Отказы стикеров одного
   * пака обычно одной природы, и одной причины достаточно.
   */
  let firstError: unknown;

  /**
   * Отказ встроенного бота посреди пака: оставшиеся стикеры не запрашиваются, а уже импортированные
   * остаются — пользователь видит, что делать, и повторный импорт со своим токеном допишет пак.
   */
  let refusal: unknown;

  for (const [index, sticker] of stickers.entries()) {
    try {
      if (!isTgSticker(sticker)) throw badResponse();
      const { file_id: fileId, file_unique_id: fileUniqueId, emoji } = sticker;

      signal?.throwIfAborted();
      const file = await guardBuiltin(
        call(host, token, 'getFile', { file_id: fileId }),
        isBuiltin
      );

      if (!isTgFile(file)) throw new Error(t('error.telegram.badFilePath'));
      const { file_path: filePath } = file;

      signal?.throwIfAborted();
      const raw = await guardBuiltin(
        host.fetchBlob(`${TG_API}/file/bot${token}/${filePath}`, MAX_STICKER_FILE_BYTES),
        isBuiltin
      );
      const kind = toSourceKind(sticker);

      signal?.throwIfAborted();
      const gif = await toStickerGif(withMimeType(raw, kind), kind, { signal });
      const id = `${TG_ID_PREFIX}${fileUniqueId}`;

      signal?.throwIfAborted();
      await putSticker({
        id,
        packId: pack.id,
        blob: gif.blob,
        width: gif.width,
        height: gif.height,
        emoji,
        /**
         * От начала импорта, а не от `createdAt` пака: у повторного импорта он прежний, а время стикеров не должно
         * зависеть от места пака в порядке паков.
         */
        createdAt: startedAt + index,
      });

      if (!pack.coverId) {
        pack.coverId = id;
        await setPackCover(pack.id, id);
      }
    } catch (e) {
      if (signal?.aborted) break;
      console.warn('[amo-stickers] sticker import failed', index, e);
      firstError ||= e;

      if (isBuiltinUnavailable(e)) {
        refusal = e;
        break;
      }
    }

    done++;
    onProgress({ done, total, title });
  }

  /**
   * Отмена после записи последнего стикера — тоже отмена: пользователь нажал «Отменить» до того,
   * как импорт сообщил об успехе.
   */
  if (signal?.aborted) {
    await rollbackImport(pack.id, previous, snapshot);
    throw signal.reason;
  }

  /**
   * Ни одного стикера не импортировано — это ошибка, а не пустая вкладка. Пак, импортированный
   * раньше, не сносим: неудачный повтор (например, без сети) вернёт его запись как была. Общий текст
   * остаётся пустому паку, где отказов не было.
   */
  if (!pack.coverId) {
    await (previous ? putPack(previous) : deletePack(pack.id));
    throw refusal || firstError || new Error(t('error.telegram.noStickers'));
  }

  if (refusal) throw refusal;

  return pack;
};
