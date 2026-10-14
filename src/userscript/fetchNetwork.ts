import type { HostNetwork } from '../core/host.types';
import { fetchChecked, readJson, readResponseLimited } from '../core/net';

/**
 * Сеть userscript прямым `fetch` со страницы — режим без сетевого API менеджера. Запросы
 * подчиняются CORS страницы, политика адресов и лимиты размера — те же, что у расширения.
 *
 * @returns сетевой контракт окружения
 */
export const fetchNetwork = (): HostNetwork => {
  return {
    async fetchJson(url) {
      const res = await fetchChecked(url);

      return readJson(res);
    },
    async fetchBlob(url, maxBytes) {
      const res = await fetchChecked(url);
      const bytes = await readResponseLimited(res, maxBytes);

      return new Blob([bytes], { type: res.headers.get('content-type') || '' });
    },
  };
};
