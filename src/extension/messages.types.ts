import type { MessageKey, MessageParam } from '@core/i18n';

type FetchRequestBase = {
  /**
   * Метка сообщения: service worker отвечает только на свои запросы.
   */
  type: 'amo-stickers:fetch';

  /**
   * Адрес запроса.
   */
  url: string;
};

type FetchJsonRequest = {
  /**
   * Вернуть тело ответа распарсенным JSON.
   */
  as: 'json';
};

type FetchBlobRequest = {
  /**
   * Вернуть тело ответа base64-байтами.
   */
  as: 'blob';

  /**
   * Предел размера тела: service worker прерывает чтение на превышении, не передавая байты
   * в content script.
   */
  maxBytes: number;
};

export type FetchRequest = FetchRequestBase & (FetchJsonRequest | FetchBlobRequest);

export type FetchSuccess = {
  /**
   * Запрос выполнен.
   */
  ok: true;

  /**
   * Тело ответа при `as: 'json'`.
   */
  json?: unknown;

  /**
   * Байты ответа в base64 при `as: 'blob'`: Blob через runtime-сообщение не передаётся.
   */
  base64?: string;

  /**
   * MIME-тип ответа при `as: 'blob'`.
   */
  mime?: string;
};

export type FetchFailure = {
  /**
   * Запрос не выполнен.
   */
  ok: false;

  /**
   * Причина ошибки на языке service worker: HTTP-статус с началом тела или текст исключения.
   */
  error: string;

  /**
   * Ключ словаря, если ошибка — `LocalizedError`: по нему content script пересоздаёт текст на языке
   * amo. Нет — `error` показывается как есть.
   */
  key?: MessageKey;

  /**
   * Подстановки текста по ключу. Нет — у строки их нет.
   */
  params?: Readonly<Record<string, MessageParam>>;
};

export type FetchResponse = FetchSuccess | FetchFailure;

export type IconThemeMessage = {
  /**
   * Метка сообщения: service worker меняет иконку кнопки только по нему.
   */
  type: 'amo-stickers:icon-theme';

  /**
   * Тёмная ли тема браузера: кнопка расширения стоит на панели браузера, а не на странице amo.
   */
  isDark: boolean;
};
