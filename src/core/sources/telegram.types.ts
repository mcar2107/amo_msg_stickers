import { isObject } from '../../shared/guards';

/**
 * Имя пака: из ссылки t.me/addstickers/<name> и из ответа `getStickerSet`. Идёт в id пака.
 */
export const SET_NAME_RE = /^[A-Za-z0-9_]+$/;

/**
 * `file_unique_id` идёт в id стикера в IndexedDB.
 */
const UNIQUE_ID_RE = /^[\w-]{1,64}$/;

/**
 * Путь файла без `..`, ведущих `/` и `.`, без `?`, `#` и `%`: иначе URL-парсер схлопнет
 * путь, и запрос с токеном уйдёт за пределы `/file/bot<token>/` — в любой метод Bot API.
 */
const FILE_PATH_RE = /^(?!.*\.\.)[\w-][\w./-]{0,199}$/;

export type TgSticker = {
  /**
   * Идентификатор файла для `getFile`.
   */
  file_id: string;

  /**
   * Постоянный идентификатор файла: одинаков у разных ботов, поэтому идёт в id стикера.
   */
  file_unique_id: string;

  /**
   * Эмодзи, привязанный к стикеру.
   */
  emoji?: string;

  /**
   * Анимированный стикер в формате TGS (Lottie).
   */
  is_animated: boolean;

  /**
   * Видеостикер в формате WebM.
   */
  is_video: boolean;
};

export type TgStickerSet = {
  /**
   * Короткое имя набора из ссылки t.me/addstickers/<name>.
   */
  name: string;

  /**
   * Отображаемое название набора.
   */
  title: string;

  /**
   * Стикеры набора в порядке Telegram; каждый проверяется `isTgSticker` при импорте, чтобы
   * битый стикер не прерывал импорт остальных.
   */
  stickers: unknown[];
};

export type TgFile = {
  /**
   * Путь для скачивания через `https://api.telegram.org/file/bot<token>/<file_path>`.
   */
  file_path: string;
};

export type TgResponse = {
  /**
   * false — запрос не выполнен, причина в `description`.
   */
  ok: boolean;

  /**
   * Результат метода Bot API; форму проверяет гард конкретного метода.
   */
  result?: unknown;

  /**
   * Текст ошибки от Telegram.
   */
  description?: string;
};

export type ImportProgress = {
  /**
   * Сколько стикеров обработано, включая упавшие при конвертации.
   */
  done: number;

  /**
   * Всего стикеров в наборе.
   */
  total: number;

  /**
   * Название импортируемого набора.
   */
  title: string;
};

export const isTgResponse = (value: unknown): value is TgResponse => {
  return (
    isObject(value) &&
    'ok' in value &&
    typeof value.ok === 'boolean' &&
    (!('description' in value) || typeof value.description === 'string')
  );
};

export const isTgStickerSet = (value: unknown): value is TgStickerSet => {
  return (
    isObject(value) &&
    'name' in value &&
    typeof value.name === 'string' &&
    SET_NAME_RE.test(value.name) &&
    'title' in value &&
    typeof value.title === 'string' &&
    'stickers' in value &&
    Array.isArray(value.stickers)
  );
};

export const isTgSticker = (value: unknown): value is TgSticker => {
  return (
    isObject(value) &&
    'file_id' in value &&
    typeof value.file_id === 'string' &&
    'file_unique_id' in value &&
    typeof value.file_unique_id === 'string' &&
    UNIQUE_ID_RE.test(value.file_unique_id) &&
    (!('emoji' in value) || typeof value.emoji === 'string') &&
    'is_animated' in value &&
    typeof value.is_animated === 'boolean' &&
    'is_video' in value &&
    typeof value.is_video === 'boolean'
  );
};

export const isTgFile = (value: unknown): value is TgFile => {
  return (
    isObject(value) &&
    'file_path' in value &&
    typeof value.file_path === 'string' &&
    FILE_PATH_RE.test(value.file_path)
  );
};

/**
 * Исход превью пака по ошибке запроса набора: `notFound` — Telegram ответил, что пака нет, и
 * ошибка встаёт к полю ссылки; `noPreview` — любой другой сбой, превью снимается без ошибки.
 */
export type PreviewOutcome = 'notFound' | 'noPreview';
