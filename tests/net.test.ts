import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocalizedError, setLocale } from '../src/core/i18n/translate';
import {
  BYTES_IN_MB,
  fetchChecked,
  httpError,
  httpStatus,
  isAllowedUrl,
  notAllowedError,
  readLimited,
  readResponseLimited,
  tooBigError,
} from '../src/core/net';

import { chunkedStream } from './helpers/chunkedStream';
import { mockResponse } from './helpers/mockResponse';

describe('isAllowedUrl', () => {
  it.each([
    'https://api.telegram.org/bot1:x/getStickerSet?name=a',
    'https://api.giphy.com/v1/gifs/trending',
    'https://media4.giphy.com/media/x/giphy.gif',
    'https://giphy.com/x.gif',
    'https://api.klipy.com/v2/featured',
    'https://static.klipy.com/x.gif',
  ])('пропускает %s', (url) => {
    expect(isAllowedUrl(url)).toBe(true);
  });

  it.each([
    'http://media.giphy.com/x.gif',
    'https://evil.example/x.gif',
    'https://giphy.com.evil.example/x.gif',
    'https://evilgiphy.com/x.gif',
    'https://api.telegram.org@evil.example/',
    'https://telegram.org/',
    'https://sub.api.telegram.org/',
    'javascript:alert(1)',
    'не адрес',
    '',
  ])('не пропускает %s', (url) => {
    expect(isAllowedUrl(url)).toBe(false);
  });
});

describe('readLimited', () => {
  it('читает поток в пределах лимита', async () => {
    const bytes = await readLimited(chunkedStream([3, 3, 4]), 10);

    expect(bytes).toHaveLength(10);
  });

  it('отменяет источник при превышении лимита', async () => {
    const onCancel = vi.fn();

    await expect(readLimited(chunkedStream([6, 6, 6], onCancel), 10)).rejects.toThrow(
      'Файл больше'
    );
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('readResponseLimited', () => {
  it('отклоняет ответ по Content-Length, не читая тело', async () => {
    const onCancel = vi.fn();
    const res = new Response(chunkedStream([1], onCancel), {
      headers: { 'content-length': '100' },
    });

    await expect(readResponseLimited(res, 10)).rejects.toThrow('Файл больше');
    expect(onCancel).toHaveBeenCalled();
  });

  it('ловит превышение без Content-Length', async () => {
    const res = new Response(chunkedStream([8, 8]));

    await expect(readResponseLimited(res, 10)).rejects.toThrow('Файл больше');
  });
});

describe('httpError', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('пишет HTTP-статус и начало тела', () => {
    expect(httpError(404, 'Not Found').message).toBe('HTTP 404 Not Found');
  });

  it('обрезает тело до 200 символов', () => {
    const { message } = httpError(500, 'x'.repeat(300));

    expect(message).toBe(`HTTP 500 ${'x'.repeat(200)}`);
  });

  it('совпадает с ошибкой fetchChecked на не-2xx', async () => {
    const body = `<html>${'y'.repeat(300)}</html>`;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return mockResponse(body, { status: 404 });
      })
    );

    await expect(fetchChecked('https://api.giphy.com/v1/gifs/trending')).rejects.toThrow(
      httpError(404, body)
    );
  });
});

describe('httpStatus', () => {
  it('читает статус из ошибки httpError', () => {
    expect(httpStatus(httpError(401, '{"ok":false}'))).toBe(401);
    expect(httpStatus(httpError(429, ''))).toBe(429);
  });

  it('null для Error без префикса HTTP', () => {
    expect(httpStatus(new Error('fetch failed'))).toBeNull();
    expect(httpStatus(new Error('прочее HTTP 401'))).toBeNull();
  });

  it('null для не-Error', () => {
    expect(httpStatus('HTTP 401 Unauthorized')).toBeNull();
    expect(httpStatus(undefined)).toBeNull();
  });
});

describe('fetchChecked', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('не обращается к сети для адреса вне политики', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchChecked('https://evil.example/x.gif')).rejects.toThrow(
      'Адрес вне списка разрешённых'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('отклоняет редирект на чужой хост', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return mockResponse('gif', { url: 'https://evil.example/x.gif' });
      })
    );

    await expect(fetchChecked('https://media.giphy.com/x.gif')).rejects.toThrow(
      'Адрес вне списка разрешённых'
    );
  });

  it('превращает не-2xx в ошибку с HTTP-статусом', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return mockResponse('Unauthorized', { status: 401 });
      })
    );

    await expect(fetchChecked('https://api.giphy.com/v1/gifs/trending')).rejects.toThrow(
      'HTTP 401 Unauthorized'
    );
  });

  it('текст ошибки политики не содержит адрес с токеном', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return mockResponse('', { url: 'https://evil.example/' });
      })
    );

    await expect(
      fetchChecked('https://api.telegram.org/bot123:secret/getMe')
    ).rejects.not.toThrow('secret');
  });
});

describe('ошибки политики и лимита на языке интерфейса', () => {
  afterEach(() => {
    setLocale('ru');
  });

  it('на ru текст прежний', () => {
    expect(notAllowedError().message).toBe('Адрес вне списка разрешённых');
    expect(tooBigError(5 * BYTES_IN_MB).message).toBe('Файл больше 5 МБ');
    expect(tooBigError(BYTES_IN_MB / 2).message).toBe('Файл больше 0.5 МБ');
  });

  it('несут ключ и лимит в МБ для пересоздания за границей service worker', () => {
    expect(notAllowedError()).toBeInstanceOf(LocalizedError);
    expect(notAllowedError()).toMatchObject({ key: 'error.net.notAllowed' });
    expect(tooBigError(5 * BYTES_IN_MB)).toMatchObject({
      key: 'error.net.tooBig',
      params: { size: 5 },
    });
  });

  it('на en — английский текст с тем же числом', () => {
    setLocale('en');

    expect(notAllowedError().message).toBe('URL is not on the allowed list');
    expect(tooBigError(8 * BYTES_IN_MB).message).toBe('File is larger than 8 MB');
  });

  it('на en число МБ в тексте равно лимиту вызова', async () => {
    setLocale('en');
    const limit = 3 * BYTES_IN_MB;

    await expect(
      readResponseLimited(
        mockResponse(null, { headers: { 'content-length': String(limit + 1) } }),
        limit
      )
    ).rejects.toThrow('File is larger than 3 MB');
    await expect(
      readLimited(chunkedStream([BYTES_IN_MB / 2 + 1]), BYTES_IN_MB / 2)
    ).rejects.toThrow('File is larger than 0.5 MB');
  });

  it('на en fetchChecked отклоняет чужой хост английским текстом', async () => {
    setLocale('en');
    vi.stubGlobal('fetch', vi.fn());

    await expect(fetchChecked('https://evil.example/x.gif')).rejects.toThrow(
      'URL is not on the allowed list'
    );
    vi.unstubAllGlobals();
  });
});
