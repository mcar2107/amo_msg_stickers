import { vi } from 'vitest';

import type { GmResponse, GmXmlhttpRequest } from '@userscript/gm.types';

import type { GmScript } from './mockGmRequest.types';

/**
 * Ответ менеджера: успешный и завершённый, если поля не заданы.
 *
 * @param patch — поля, отличные от успешного ответа без тела
 * @returns ответ для колбэков запроса
 */
export const gmResponse = (patch: Partial<GmResponse> = {}): GmResponse => {
  return { status: 200, readyState: 4, responseHeaders: '', response: null, ...patch };
};

/**
 * Мок `GM_xmlhttpRequest`. `abort()` зовёт `onabort` синхронно, как делают менеджеры, —
 * так проверяется, что обрыв не подменяет причину ошибки.
 *
 * @param script — поведение менеджера после запроса
 * @returns мок запроса и мок `abort` его handle
 */
export const mockGmRequest = (script: GmScript) => {
  const abort = vi.fn();
  const request = vi.fn<GmXmlhttpRequest>((details) => {
    abort.mockImplementation(() => {
      details.onabort(gmResponse({ status: 0 }));
    });
    script(details);

    return { abort };
  });

  return { request, abort };
};
