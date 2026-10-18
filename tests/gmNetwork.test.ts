import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '@core/i18n';
import {
  BYTES_IN_MB,
  ERROR_BODY_MAX_BYTES,
  httpError,
  MAX_JSON_BYTES,
  notAllowedError,
  tooBigError,
} from '@core/net';
import { gmNetwork } from '@userscript/gmNetwork';

import { gmResponse, mockGmRequest } from './helpers';

/**
 * В пути запроса к Telegram лежит токен бота — он не должен попасть в текст ошибки.
 */
const SECRET = 'SECRET';
const TG_URL = `https://api.telegram.org/bot123:${SECRET}/getStickerSet?name=a`;
const FILE_URL = `https://api.telegram.org/file/bot123:${SECRET}/stickers/a.webm`;
const EVIL_URL = 'https://evil.example/x.gif';
const LIMIT = BYTES_IN_MB;
const TOO_BIG = tooBigError(LIMIT).message;
const JSON_TOO_BIG = tooBigError(MAX_JSON_BYTES).message;
const NOT_ALLOWED = notAllowedError().message;
const HEADERS_RECEIVED = 2;
const LONG_BODY = 'x'.repeat(300);

afterEach(() => {
  setLocale('ru');
});

const bytes = (length: number) => {
  return new Uint8Array(length).fill(7).buffer;
};

describe('gmNetwork: политика адресов', () => {
  it('адрес вне политики — ошибка без запроса', async () => {
    const { request } = mockGmRequest(() => {});
    const network = gmNetwork(request);

    await expect(network.fetchJson(EVIL_URL)).rejects.toThrow(NOT_ALLOWED);
    await expect(network.fetchBlob(EVIL_URL, LIMIT)).rejects.toThrow(NOT_ALLOWED);
    expect(request).not.toHaveBeenCalled();
  });

  it('finalUrl вне политики — ошибка даже при валидном JSON', async () => {
    const { request, abort } = mockGmRequest(({ onload }) => {
      onload(gmResponse({ finalUrl: EVIL_URL, response: '{"ok":true}' }));
    });

    await expect(gmNetwork(request).fetchJson(TG_URL)).rejects.toThrow(NOT_ALLOWED);
    expect(abort).toHaveBeenCalled();
  });

  it('finalUrl вне политики на заголовках — обрыв до тела', async () => {
    const { request, abort } = mockGmRequest(({ onreadystatechange }) => {
      onreadystatechange(
        gmResponse({ readyState: HEADERS_RECEIVED, finalUrl: EVIL_URL })
      );
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(
      NOT_ALLOWED
    );
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('без finalUrl итоговым считается адрес запроса', async () => {
    const { request } = mockGmRequest(({ onload }) => {
      onload(gmResponse({ response: '{"ok":true}' }));
    });

    await expect(gmNetwork(request).fetchJson(TG_URL)).resolves.toEqual({ ok: true });
  });
});

describe('gmNetwork: ошибки HTTP', () => {
  it('404 у JSON — HTTP 404 и начало тела', async () => {
    const { request } = mockGmRequest(({ onload }) => {
      onload(gmResponse({ status: 404, response: LONG_BODY, responseText: LONG_BODY }));
    });
    const error = await gmNetwork(request)
      .fetchJson(TG_URL)
      .catch((error_: unknown) => {
        return error_;
      });

    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty('message', httpError(404, LONG_BODY).message);
    expect(String(error)).toContain('HTTP 404');
  });

  it('404 у Blob — тело arraybuffer разобрано текстом', async () => {
    const { request } = mockGmRequest(({ onload }) => {
      onload(
        gmResponse({
          status: 404,
          response: new TextEncoder().encode('Not Found').buffer,
        })
      );
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(
      httpError(404, 'Not Found').message
    );
  });

  it('не-2xx с Content-Length больше лимита — HTTP-ошибка и обрыв на заголовках', async () => {
    const { request, abort } = mockGmRequest(({ onreadystatechange }) => {
      onreadystatechange(
        gmResponse({
          status: 404,
          readyState: HEADERS_RECEIVED,
          responseHeaders: `Content-Length: ${LIMIT + 1}`,
        })
      );
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(
      httpError(404, '').message
    );
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('не-2xx больше лимита в onprogress — HTTP-ошибка с тем, что успело прийти', async () => {
    const { request, abort } = mockGmRequest(({ onprogress }) => {
      onprogress(
        gmResponse({
          status: 503,
          readyState: 3,
          loaded: LIMIT + 1,
          responseText: LONG_BODY,
        })
      );
    });
    const error = await gmNetwork(request)
      .fetchBlob(FILE_URL, LIMIT)
      .catch((error_: unknown) => {
        return error_;
      });

    expect(error).toHaveProperty('message', httpError(503, LONG_BODY).message);
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('статус с заголовков, лимит в onprogress без статуса — HTTP-ошибка', async () => {
    const { request, abort } = mockGmRequest(({ onreadystatechange, onprogress }) => {
      onreadystatechange(gmResponse({ status: 404, readyState: HEADERS_RECEIVED }));
      onprogress(gmResponse({ status: 0, readyState: 3, loaded: LIMIT + 1 }));
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(
      httpError(404, '').message
    );
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('не-2xx больше лимита только на onload — HTTP-ошибка, не «Файл больше»', async () => {
    const { request } = mockGmRequest(({ onload }) => {
      onload(gmResponse({ status: 500, response: bytes(LIMIT + 1) }));
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(
      'HTTP 500'
    );
  });
});

describe('gmNetwork: лимит размера', () => {
  it('Content-Length больше лимита — обрыв на заголовках', async () => {
    const { request, abort } = mockGmRequest(({ onreadystatechange }) => {
      onreadystatechange(
        gmResponse({
          readyState: HEADERS_RECEIVED,
          responseHeaders: `content-type: video/webm\r\nCONTENT-LENGTH: ${LIMIT + 1}\r\n`,
        })
      );
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(TOO_BIG);
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('Content-Length больше лимита после возврата handle — тот же обрыв', async () => {
    const { request, abort } = mockGmRequest(({ onreadystatechange }) => {
      queueMicrotask(() => {
        onreadystatechange(
          gmResponse({
            readyState: HEADERS_RECEIVED,
            responseHeaders: `Content-Length: ${LIMIT + 1}`,
          })
        );
      });
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(TOO_BIG);
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('loaded больше лимита в onprogress — обрыв по ходу загрузки', async () => {
    const { request, abort } = mockGmRequest(({ onprogress }) => {
      onprogress(gmResponse({ readyState: 3, loaded: LIMIT / 2 }));
      onprogress(gmResponse({ readyState: 3, loaded: LIMIT + 1 }));
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(TOO_BIG);
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('ответ больше лимита без progress — ошибка на onload', async () => {
    const { request, abort } = mockGmRequest(({ onload }) => {
      onload(gmResponse({ response: bytes(LIMIT + 1) }));
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(TOO_BIG);
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('ответ ровно в лимит проходит', async () => {
    const { request, abort } = mockGmRequest(
      ({ onreadystatechange, onprogress, onload }) => {
        onreadystatechange(
          gmResponse({
            readyState: HEADERS_RECEIVED,
            responseHeaders: `Content-Length: ${LIMIT}`,
          })
        );
        onprogress(gmResponse({ readyState: 3, loaded: LIMIT }));
        onload(gmResponse({ response: bytes(LIMIT) }));
      }
    );

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).resolves.toHaveProperty(
      'size',
      LIMIT
    );
    expect(abort).not.toHaveBeenCalled();
  });
});

describe('gmNetwork: лимит JSON', () => {
  it('Content-Length больше лимита — обрыв на заголовках', async () => {
    const { request, abort } = mockGmRequest(({ onreadystatechange }) => {
      onreadystatechange(
        gmResponse({
          readyState: HEADERS_RECEIVED,
          responseHeaders: `Content-Length: ${MAX_JSON_BYTES + 1}`,
        })
      );
    });

    await expect(gmNetwork(request).fetchJson(TG_URL)).rejects.toThrow(JSON_TOO_BIG);
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('loaded больше лимита в onprogress — обрыв по ходу загрузки', async () => {
    const { request, abort } = mockGmRequest(({ onprogress }) => {
      onprogress(gmResponse({ readyState: 3, loaded: MAX_JSON_BYTES + 1 }));
    });

    await expect(gmNetwork(request).fetchJson(TG_URL)).rejects.toThrow(JSON_TOO_BIG);
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('текст больше лимита в байтах UTF-8 только на onload — ошибка', async () => {
    /**
     * «я» — 2 байта UTF-8: символов меньше лимита, байтов — больше.
     */
    const body = 'я'.repeat(MAX_JSON_BYTES / 2 + 1);
    const { request, abort } = mockGmRequest(({ onload }) => {
      onload(gmResponse({ response: body }));
    });

    await expect(gmNetwork(request).fetchJson(TG_URL)).rejects.toThrow(JSON_TOO_BIG);
    expect(abort).toHaveBeenCalledTimes(1);
  });
});

describe('gmNetwork: тело ошибки', () => {
  it('не-2xx больше предела тела ошибки в onprogress — обрыв с HTTP-ошибкой', async () => {
    const { request, abort } = mockGmRequest(({ onprogress }) => {
      onprogress(
        gmResponse({
          status: 502,
          readyState: 3,
          loaded: ERROR_BODY_MAX_BYTES + 1,
          responseText: LONG_BODY,
        })
      );
    });

    await expect(gmNetwork(request).fetchJson(TG_URL)).rejects.toThrow(
      httpError(502, LONG_BODY).message
    );
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('статус с заголовков, тело ошибки больше предела — обрыв', async () => {
    const { request, abort } = mockGmRequest(({ onreadystatechange, onprogress }) => {
      onreadystatechange(gmResponse({ status: 502, readyState: HEADERS_RECEIVED }));
      onprogress(
        gmResponse({ status: 0, readyState: 3, loaded: ERROR_BODY_MAX_BYTES + 1 })
      );
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(
      httpError(502, '').message
    );
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it('тело ошибки в пределах — дочитывается до onload', async () => {
    const { request, abort } = mockGmRequest(({ onprogress, onload }) => {
      onprogress(
        gmResponse({ status: 404, readyState: 3, loaded: ERROR_BODY_MAX_BYTES })
      );
      onload(gmResponse({ status: 404, response: 'Not Found' }));
    });

    await expect(gmNetwork(request).fetchJson(TG_URL)).rejects.toThrow(
      httpError(404, 'Not Found').message
    );
    expect(abort).not.toHaveBeenCalled();
  });

  it('Content-Length тела ошибки больше предела, но в лимите — на заголовках не обрывается', async () => {
    const { request, abort } = mockGmRequest(({ onreadystatechange, onload }) => {
      onreadystatechange(
        gmResponse({
          status: 404,
          readyState: HEADERS_RECEIVED,
          responseHeaders: `Content-Length: ${ERROR_BODY_MAX_BYTES + 1}`,
        })
      );
      onload(gmResponse({ status: 404, response: 'Not Found' }));
    });

    await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(
      httpError(404, 'Not Found').message
    );
    expect(abort).not.toHaveBeenCalled();
  });
});

describe('gmNetwork: успешные ответы', () => {
  it('JSON разобран', async () => {
    const { request } = mockGmRequest(({ onload }) => {
      onload(gmResponse({ response: '{"ok":true,"result":[1,2]}' }));
    });

    await expect(gmNetwork(request).fetchJson(TG_URL)).resolves.toEqual({
      ok: true,
      result: [1, 2],
    });
  });

  it('Blob с типом из Content-Type и байтами тела', async () => {
    const { request } = mockGmRequest(({ onload }) => {
      onload(
        gmResponse({
          responseHeaders: 'Content-Length: 3\r\nContent-Type: image/gif\r\n',
          response: new Uint8Array([1, 2, 3]).buffer,
        })
      );
    });
    const blob = await gmNetwork(request).fetchBlob(FILE_URL, LIMIT);

    expect(blob.type).toBe('image/gif');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it.each([
    ['ru', 'Ответ пришёл не байтами'],
    ['en', 'The response body is not bytes'],
  ] as const)(
    'тело Blob не байтами — ошибка, а не пустой Blob (%s)',
    async (locale, message) => {
      setLocale(locale);
      const { request } = mockGmRequest(({ onload }) => {
        onload(gmResponse({ response: 'GIF89a' }));
      });

      await expect(gmNetwork(request).fetchBlob(FILE_URL, LIMIT)).rejects.toThrow(
        message
      );
    }
  );

  it('запрос уходит без cookie, в нужном формате тела и по адресу запроса', async () => {
    const { request } = mockGmRequest(({ onload }) => {
      onload(gmResponse({ response: '{}' }));
    });
    const network = gmNetwork(request);

    await network.fetchJson(TG_URL);
    await network.fetchBlob(FILE_URL, LIMIT).catch(() => {});

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      method: 'GET',
      url: TG_URL,
      anonymous: true,
      responseType: 'text',
    });
    expect(request.mock.calls[1]?.[0]).toMatchObject({
      url: FILE_URL,
      anonymous: true,
      responseType: 'arraybuffer',
    });
  });
});

describe('gmNetwork: сбои сети', () => {
  it.each([
    ['onerror', 'ru', 'Сетевая ошибка'],
    ['ontimeout', 'ru', 'Сервер не ответил вовремя'],
    ['onabort', 'ru', 'Запрос прерван'],
    ['onerror', 'en', 'Network error'],
    ['ontimeout', 'en', 'The server did not respond in time'],
    ['onabort', 'en', 'Request aborted'],
  ] as const)(
    '%s на %s — ошибка без адреса и токена',
    async (callback, locale, message) => {
      setLocale(locale);
      const { request } = mockGmRequest((details) => {
        details[callback](gmResponse({ status: 0, finalUrl: TG_URL }));
      });
      const error = await gmNetwork(request)
        .fetchJson(TG_URL)
        .catch((error_: unknown) => {
          return error_;
        });

      expect(error).toHaveProperty('message', message);
      expect(String(error)).not.toContain(SECRET);
      expect(String(error)).not.toContain('api.telegram.org');
    }
  );
});
