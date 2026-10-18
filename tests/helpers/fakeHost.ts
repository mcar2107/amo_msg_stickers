import { vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@core/host';
import type { Host } from '@core/host.types';

import type { FakeHostInit } from './fakeHost.types';

/**
 * `Host` без сети: JSON и Blob отдаются из `init`, вызовы записываются моками vitest.
 * Лимит `fetchBlob` соблюдается как у настоящего `Host`: Blob больше `maxBytes` — исключение.
 *
 * @param init — ответы на `fetchJson` и `fetchBlob`
 * @returns фейковое окружение
 */
export const fakeHost = ({ json, onJson, blob }: FakeHostInit = {}): Host => {
  return {
    name: 'userscript',
    fetchJson: vi.fn(async (url: string) => {
      return onJson ? onJson(url) : json;
    }),
    fetchBlob: vi.fn(async (_url: string, maxBytes: number) => {
      const result = blob || new Blob();

      if (result.size > maxBytes) throw new Error(`Файл больше ${maxBytes} байт`);

      return result;
    }),
    getSettings: vi.fn(async () => {
      return { ...DEFAULT_SETTINGS };
    }),
    setSettings: vi.fn(async () => {}),
  };
};
