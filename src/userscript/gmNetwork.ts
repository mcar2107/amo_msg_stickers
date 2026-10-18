import type { HostNetwork } from '@core/host.types';
import type { MessageKey } from '@core/i18n';
import { t } from '@core/i18n';
import {
  assertAllowedUrl,
  ERROR_BODY_MAX_BYTES,
  httpError,
  isAllowedUrl,
  MAX_JSON_BYTES,
  notAllowedError,
  tooBigError,
} from '@core/net';

import {
  type GmResponse,
  type GmResponseType,
  type GmXmlhttpRequest,
  isArrayBuffer,
} from './gm.types';

/**
 * Сеть userscript через API менеджера: запросы идут в обход CORS страницы, а политика адресов,
 * тексты ошибок и лимит размера — те же, что у расширения (`core/net.ts`).
 */

/**
 * `readyState`, на котором уже известны статус и заголовки, а тело ещё не читалось.
 */
const HEADERS_RECEIVED = 2;

const OK_STATUS_MIN = 200;
const OK_STATUS_MAX = 299;

/**
 * Тексты без адреса запроса: в пути запросов к Telegram лежит токен бота, а текст ошибки
 * показывается в попапе и пишется в консоль.
 */
const NETWORK_ERROR = 'error.net.network' satisfies MessageKey;
const TIMEOUT_ERROR = 'error.net.timeout' satisfies MessageKey;
const ABORT_ERROR = 'error.net.aborted' satisfies MessageKey;

/**
 * Менеджер отдал тело `arraybuffer`-запроса не байтами: пустой Blob ушёл бы дальше как
 * стикер, поэтому это ошибка.
 */
const BODY_NOT_BYTES = 'error.net.bodyNotBytes' satisfies MessageKey;

/**
 * Значение заголовка из строки `responseHeaders`. Имя сравнивается без учёта регистра:
 * менеджеры отдают заголовки так, как их прислал сервер.
 *
 * @param headers — заголовки ответа одной строкой
 * @param name — имя заголовка в нижнем регистре
 * @returns значение заголовка; пустая строка — заголовка нет
 */
const headerValue = (headers: string, name: string) => {
  const line = headers.split(/\r?\n/).find((row) => {
    const colon = row.indexOf(':');

    return colon > 0 && row.slice(0, colon).trim().toLowerCase() === name;
  });

  return line ? line.slice(line.indexOf(':') + 1).trim() : '';
};

/**
 * Тело ответа текстом — для JSON и для текста ошибки не-2xx ответа, в том числе у
 * `arraybuffer`-запроса.
 *
 * @param response — ответ менеджера
 * @returns тело текстом; пустая строка — тела нет
 */
const bodyText = ({ response, responseText }: GmResponse) => {
  if (isArrayBuffer(response)) return new TextDecoder().decode(response);
  if (typeof response === 'string') return response;

  return responseText || '';
};

/**
 * Размер тела в байтах. Текст считается в UTF-8, а не в символах: лимит — байтовый, как у
 * ответа fetch.
 *
 * @param response — ответ менеджера
 * @returns размер тела в байтах
 */
const bodyByteLength = (response: GmResponse) => {
  const { response: body } = response;

  if (isArrayBuffer(body)) return body.byteLength;

  return new TextEncoder().encode(bodyText(response)).byteLength;
};

const isOkStatus = (status: number) => {
  return status >= OK_STATUS_MIN && status <= OK_STATUS_MAX;
};

/**
 * 0 — статус ещё не известен (или ответа нет), это не HTTP-ошибка.
 *
 * @param status — HTTP-статус из ответа менеджера
 * @returns true, если сервер ответил не-2xx
 */
const isErrorStatus = (status: number) => {
  return status > 0 && !isOkStatus(status);
};

/**
 * Запрос через менеджер в рамках сетевой политики. Адрес вне политики — исключение без
 * обращения к сети. Итоговый адрес после редиректа, статус и размер проверяются до того, как
 * ответ отдаётся вызывающей стороне; тело больше `maxBytes` обрывает загрузку, а тело не-2xx
 * ответа — как только пришло больше, чем нужно для текста ошибки.
 *
 * @param request — `GM_xmlhttpRequest` или его подмена
 * @param url — адрес запроса
 * @param responseType — формат тела ответа
 * @param maxBytes — предел размера тела
 * @returns успешно загруженный ответ
 */
const send = (
  request: GmXmlhttpRequest,
  url: string,
  responseType: GmResponseType,
  maxBytes: number
) => {
  assertAllowedUrl(url);

  return new Promise<GmResponse>((resolve, reject) => {
    let isSettled = false;
    let shouldAbort = false;

    /**
     * Менеджер (и мок в тестах) может позвать колбэк синхронно, ещё до того, как вернул
     * handle, — тогда обрыв откладывается до возврата из `request`.
     */
    let abortRequest = () => {
      shouldAbort = true;
    };

    const fail = (error: Error) => {
      if (isSettled) return;
      isSettled = true;
      reject(error);
    };

    /**
     * Флаг ставится до `abort()`: менеджер может позвать `onabort` синхронно, и тот не
     * должен подменить причину обрыва.
     */
    const stop = (error: Error) => {
      if (isSettled) return;
      fail(error);
      abortRequest();
    };

    const isAllowedFinalUrl = ({ finalUrl }: GmResponse) => {
      return isAllowedUrl(finalUrl || url);
    };

    /**
     * Статус с заголовков: не каждый менеджер кладёт его в `onprogress`.
     */
    let headersStatus = 0;

    /**
     * @param response — ответ менеджера
     * @returns статус ответа; 0 — ещё не известен
     */
    const statusOf = (response: GmResponse) => {
      return response.status || headersStatus;
    };

    /**
     * Причина обрыва по лимиту. Не-2xx статус важнее размера: вызывающей стороне нужна
     * HTTP-ошибка, какие бы колбэки ни позвал менеджер, а тело сверх лимита не дочитывается —
     * в тексте то, что успело прийти.
     *
     * @param response — ответ менеджера на момент превышения лимита
     * @returns ошибка для `stop`
     */
    const overLimitError = (response: GmResponse) => {
      const status = statusOf(response);

      return isErrorStatus(status)
        ? httpError(status, bodyText(response))
        : tooBigError(maxBytes);
    };

    /**
     * Сколько тела можно дочитать по ходу загрузки. Тело не-2xx ответа нужно только ради начала в
     * тексте ошибки — оно обрывается раньше лимита. На заголовках так не обрываем: менеджер ещё
     * не отдал ни байта, и текст ошибки остался бы без начала тела.
     *
     * @param response — ответ менеджера на момент прогресса
     * @returns предел в байтах
     */
    const progressLimit = (response: GmResponse) => {
      return isErrorStatus(statusOf(response))
        ? Math.min(maxBytes, ERROR_BODY_MAX_BYTES)
        : maxBytes;
    };

    const handle = request({
      method: 'GET',
      url,
      responseType,
      anonymous: true,
      onreadystatechange: (response) => {
        if (response.readyState !== HEADERS_RECEIVED) return;

        headersStatus = response.status;

        if (!isAllowedFinalUrl(response)) {
          stop(notAllowedError());
        } else if (
          Number(headerValue(response.responseHeaders, 'content-length')) > maxBytes
        ) {
          stop(overLimitError(response));
        }
      },
      onprogress: (response) => {
        if ((response.loaded || 0) > progressLimit(response)) {
          stop(overLimitError(response));
        }
      },
      onload: (response) => {
        const { status } = response;

        if (!isAllowedFinalUrl(response)) {
          stop(notAllowedError());
        } else if (!isOkStatus(status)) {
          fail(httpError(status, bodyText(response)));
        } else if (bodyByteLength(response) > maxBytes) {
          stop(tooBigError(maxBytes));
        } else if (!isSettled) {
          isSettled = true;
          resolve(response);
        }
      },
      onerror: () => {
        fail(new Error(t(NETWORK_ERROR)));
      },
      ontimeout: () => {
        fail(new Error(t(TIMEOUT_ERROR)));
      },
      onabort: () => {
        fail(new Error(t(ABORT_ERROR)));
      },
    });

    abortRequest = () => {
      handle.abort();
    };

    if (shouldAbort) handle.abort();
  });
};

/**
 * Сеть userscript через `GM_xmlhttpRequest`: в обход CORS страницы и без cookie целевых
 * сайтов. Ошибки — те же тексты, что у расширения: «Адрес вне списка разрешённых» (в том
 * числе для итогового адреса после редиректа), «Файл больше N МБ» — и для JSON больше
 * `MAX_JSON_BYTES`, `HTTP <код> <начало тела>`.
 *
 * @param request — `GM_xmlhttpRequest` менеджера; в тестах — мок
 * @returns сетевой контракт окружения
 */
export const gmNetwork = (request: GmXmlhttpRequest): HostNetwork => {
  return {
    async fetchJson(url) {
      const response = await send(request, url, 'text', MAX_JSON_BYTES);
      const json: unknown = JSON.parse(bodyText(response));

      return json;
    },
    async fetchBlob(url, maxBytes) {
      const response = await send(request, url, 'arraybuffer', maxBytes);
      const { response: body, responseHeaders } = response;

      if (!isArrayBuffer(body)) throw new Error(t(BODY_NOT_BYTES));

      return new Blob([body], { type: headerValue(responseHeaders, 'content-type') });
    },
  };
};
