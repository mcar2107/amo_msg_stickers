import { afterEach, describe, expect, it } from 'vitest';

import { LocalizedError, setLocale } from '@core/i18n';
import { BYTES_IN_MB, notAllowedError, tooBigError } from '@core/net';
import { toFailureResponse, unwrapFetchResponse } from '@extension/fetchResponse';
import type { FetchResponse } from '@extension/messages.types';

/**
 * Ответ так, как его получает content script: runtime-сообщение сериализуется в JSON.
 *
 * @param response — ответ service worker
 * @returns ответ после передачи через границу
 */
const overBoundary = (response: FetchResponse): FetchResponse => {
  return JSON.parse(JSON.stringify(response));
};

/**
 * @param response — ответ service worker
 * @returns ошибка, которую бросил разбор ответа
 */
const thrownBy = (response: FetchResponse | undefined) => {
  try {
    unwrapFetchResponse(response);
  } catch (error) {
    return error;
  }

  throw new Error('разбор ответа не бросил ошибку');
};

afterEach(() => {
  setLocale('ru');
});

describe('toFailureResponse', () => {
  it('кладёт ключ и параметры только для LocalizedError', () => {
    expect(toFailureResponse(tooBigError(5 * BYTES_IN_MB))).toStrictEqual({
      ok: false,
      error: 'Файл больше 5 МБ',
      key: 'error.net.tooBig',
      params: { size: 5 },
    });
    expect(toFailureResponse(notAllowedError())).toStrictEqual({
      ok: false,
      error: 'Адрес вне списка разрешённых',
      key: 'error.net.notAllowed',
    });
    expect(toFailureResponse(new TypeError('Failed to fetch'))).toStrictEqual({
      ok: false,
      error: 'Failed to fetch',
    });
    expect(toFailureResponse('oops')).toStrictEqual({ ok: false, error: 'oops' });
  });
});

describe('unwrapFetchResponse', () => {
  it('возвращает успешный ответ как есть', () => {
    const response: FetchResponse = { ok: true, json: { a: 1 } };

    expect(unwrapFetchResponse(response)).toBe(response);
  });

  it('ответ с ключом на en даёт английский текст с лимитом SW', () => {
    const response = overBoundary(toFailureResponse(tooBigError(5 * BYTES_IN_MB)));

    setLocale('en');
    const error = thrownBy(response);

    expect(error).toBeInstanceOf(LocalizedError);
    expect(error).toMatchObject({
      message: 'File is larger than 5 MB',
      key: 'error.net.tooBig',
      params: { size: 5 },
    });
  });

  it('ключ без подстановок на en даёт английский текст', () => {
    const response = overBoundary(toFailureResponse(notAllowedError()));

    setLocale('en');

    expect(thrownBy(response)).toMatchObject({
      message: 'URL is not on the allowed list',
    });
  });

  it('без ключа — текст SW как есть', () => {
    setLocale('en');
    const error = thrownBy({ ok: false, error: 'HTTP 403 Forbidden' });

    expect(error).not.toBeInstanceOf(LocalizedError);
    expect(error).toMatchObject({ message: 'HTTP 403 Forbidden' });
  });

  it('ключ без обязательной подстановки — текст SW как есть', () => {
    setLocale('en');

    expect(
      thrownBy({ ok: false, error: 'Файл больше 5 МБ', key: 'error.net.tooBig' })
    ).toMatchObject({ message: 'Файл больше 5 МБ' });
  });

  it('без ответа — общая ошибка', () => {
    expect(thrownBy(undefined)).toMatchObject({ message: 'fetch failed' });
  });
});
