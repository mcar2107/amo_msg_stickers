import { start } from '@core/app';
import { DEFAULT_SETTINGS, pickSettings } from '@core/host';
import type { Host } from '@core/host.types';

import { unwrapFetchResponse } from './fetchResponse';
import type { FetchRequest, FetchResponse, IconThemeMessage } from './messages.types';

/**
 * Тема браузера, а не amo: кнопка расширения стоит на панели браузера. Страница видит её
 * через `prefers-color-scheme`, service worker — нет.
 */
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

const bgFetch = async (request: FetchRequest) => {
  const res: FetchResponse | undefined = await chrome.runtime.sendMessage(request);

  return unwrapFetchResponse(res);
};

const host: Host = {
  name: 'extension',
  async fetchJson(url) {
    const { json } = await bgFetch({ type: 'amo-stickers:fetch', url, as: 'json' });

    return json;
  },
  async fetchBlob(url, maxBytes) {
    const { base64, mime } = await bgFetch({
      type: 'amo-stickers:fetch',
      url,
      as: 'blob',
      maxBytes,
    });
    const bytes = Uint8Array.from(atob(base64 || ''), (char) => {
      return char.charCodeAt(0);
    });

    return new Blob([bytes], { type: mime || '' });
  },
  async getSettings() {
    const { settings } = await chrome.storage.local.get('settings');

    return { ...DEFAULT_SETTINGS, ...pickSettings(settings) };
  },
  async setSettings(patch) {
    const current = await this.getSettings();

    await chrome.storage.local.set({ settings: { ...current, ...patch } });
  },
};

/**
 * Сбой отправки — не повод ронять content script: иконка останется прежней, а после
 * обновления расширения контекст старой вкладки просто отключён от service worker.
 */
const sendIconTheme = async (isDark: boolean) => {
  const message: IconThemeMessage = { type: 'amo-stickers:icon-theme', isDark };

  try {
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.warn('[amo-stickers] action icon theme not sent', error);
  }
};

const watchIconTheme = () => {
  const query = matchMedia(DARK_SCHEME_QUERY);

  const handleSchemeChange = ({ matches }: MediaQueryListEvent) => {
    void sendIconTheme(matches);
  };

  void sendIconTheme(query.matches);
  query.addEventListener('change', handleSchemeChange);
};

start(host);
watchIconTheme();
