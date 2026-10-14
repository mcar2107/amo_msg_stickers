import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_JSON_BYTES, tooBigError } from '../src/core/net';
import { fetchNetwork } from '../src/userscript/fetchNetwork';

import { chunkedStream } from './helpers/chunkedStream';
import { mockResponse } from './helpers/mockResponse';

const API_URL = 'https://api.giphy.com/v1/gifs/trending';

/**
 * Подменяет `fetch` страницы одним ответом.
 *
 * @param res — ответ на любой запрос
 */
const stubFetch = (res: Response) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      return res;
    })
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchNetwork: fetchJson', () => {
  it('JSON разобран', async () => {
    stubFetch(mockResponse('{"data":[1]}'));

    await expect(fetchNetwork().fetchJson(API_URL)).resolves.toEqual({ data: [1] });
  });

  it('JSON больше лимита — «Файл больше 2 МБ», остаток не читается', async () => {
    const onCancel = vi.fn();

    stubFetch(mockResponse(chunkedStream([MAX_JSON_BYTES, 1, 1], onCancel)));

    await expect(fetchNetwork().fetchJson(API_URL)).rejects.toThrow(
      tooBigError(MAX_JSON_BYTES).message
    );
    expect(onCancel).toHaveBeenCalled();
  });

  it('Content-Length больше лимита — ошибка без чтения тела', async () => {
    const onCancel = vi.fn();

    stubFetch(
      mockResponse(chunkedStream([1], onCancel), {
        headers: { 'content-length': String(MAX_JSON_BYTES + 1) },
      })
    );

    await expect(fetchNetwork().fetchJson(API_URL)).rejects.toThrow(
      tooBigError(MAX_JSON_BYTES).message
    );
    expect(onCancel).toHaveBeenCalled();
  });
});
