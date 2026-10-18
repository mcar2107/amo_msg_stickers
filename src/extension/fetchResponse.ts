import type { MessageArgs, MessageKey } from '@core/i18n';
import { LocalizedError, PLACEHOLDER, RU } from '@core/i18n';

import type { FetchFailure, FetchResponse, FetchSuccess } from './messages.types';

/**
 * Текст отказа без ответа SW: канал закрылся раньше `sendResponse`. Технический, как `HTTP <код>`, и не
 * переводится.
 */
const FETCH_FAILED = 'fetch failed';

/**
 * Параметры пришли JSON-ом runtime-сообщения, и компилятор не знает, каких подстановок ждёт строка `key`:
 * их набор сверяется с русским эталоном словаря. Ключ не из словаря и неполные параметры — не аргументы
 * `t()`, такой отказ показывается текстом SW.
 *
 * @param key — ключ словаря из ответа SW
 * @param args — аргументы после ключа
 * @returns true, если с этими аргументами строку можно собрать
 */
const isMessageArgs = (
  key: MessageKey,
  args: readonly unknown[]
): args is MessageArgs<MessageKey> => {
  if (!Object.hasOwn(RU, key)) return false;
  const [params] = args;
  const names = Array.from(RU[key].matchAll(PLACEHOLDER), ([, name]) => {
    return name || '';
  });

  if (!names.length) return params === undefined;

  return (
    !!params &&
    typeof params === 'object' &&
    names.every((name) => {
      const value: unknown = Object.getOwnPropertyDescriptor(params, name)?.value;

      return typeof value === 'string' || typeof value === 'number';
    })
  );
};

/**
 * Отказ SW для content script. Ключ и параметры едут рядом с текстом только у `LocalizedError`: её текст
 * собран на языке SW, а показать его нужно на языке amo, который знает лишь мир страницы.
 *
 * @param error — исключение запроса в SW
 * @returns ответ-отказ
 */
export const toFailureResponse = (error: unknown): FetchFailure => {
  const failure: FetchFailure = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };

  if (!(error instanceof LocalizedError)) return failure;

  return { ...failure, key: error.key, ...(error.params && { params: error.params }) };
};

/**
 * Разбор ответа SW в content script. Отказ с ключом становится `LocalizedError` на текущем языке —
 * языке amo; без ключа (сообщение браузера, `HTTP <код> <тело>`) — `Error` с текстом SW как есть.
 *
 * @param response — ответ SW; `undefined` — ответа нет
 * @returns успешный ответ
 */
export const unwrapFetchResponse = (
  response: FetchResponse | undefined
): FetchSuccess => {
  if (response?.ok) return response;
  if (!response) throw new Error(FETCH_FAILED);

  const { error, key, params } = response;
  const args = [params];

  if (key && isMessageArgs(key, args)) throw new LocalizedError(key, ...args);

  throw new Error(error || FETCH_FAILED);
};
