import { PAGE_AGENT_CODE } from 'page-agent:code';

import { start } from '../core/app';
import type { Host, HostNetwork, HostSettings } from '../core/host.types';

import { fetchNetwork } from './fetchNetwork';
import type { GmGetValue, GmSetValue, GmXmlhttpRequest } from './gm.types';
import { gmNetwork } from './gmNetwork';
import { injectPageAgent } from './pageAgent';
import { gmSettings, localStorageSettings } from './settings';

/**
 * Вариант для менеджеров userscript-ов (Tampermonkey, Violentmonkey и т. п.). Режим
 * выбирается здесь и только здесь — по тому, что выдал менеджер:
 *
 * - есть `GM_xmlhttpRequest` — сеть через менеджер, в обход CORS страницы и без cookie
 *   целевых сайтов; нет — прямой `fetch` со страницы, под её CORS;
 * - есть `GM_getValue` и `GM_setValue` — настройки в хранилище менеджера, недоступном
 *   странице, с переносом из `localStorage`; нет — в `localStorage` страницы.
 *
 * Без менеджера (скрипт подключён на страницу напрямую) работают оба запасных пути.
 */

/**
 * GM API менеджер кладёт в область видимости скрипта, а не в `window`, поэтому наличие
 * проверяется `typeof`. Объявления живут в модуле, а не в `src/types.d.ts`: ядро не может
 * сослаться на GM API даже по ошибке.
 */
declare const GM_xmlhttpRequest: GmXmlhttpRequest | undefined;
declare const GM_getValue: GmGetValue | undefined;
declare const GM_setValue: GmSetValue | undefined;

const pickNetwork = (): HostNetwork => {
  if (typeof GM_xmlhttpRequest === 'function') return gmNetwork(GM_xmlhttpRequest);

  return fetchNetwork();
};

const pickHostSettings = (): HostSettings => {
  if (typeof GM_getValue === 'function' && typeof GM_setValue === 'function') {
    return gmSettings({ getValue: GM_getValue, setValue: GM_setValue }, localStorage);
  }

  return localStorageSettings(localStorage);
};

const host: Host = {
  name: 'userscript',
  ...pickNetwork(),
  ...pickHostSettings(),
};

/**
 * Агент — сразу, до скриптов страницы: в Worker-версии amo web ядро страницы видно только тому, кто начал работу
 * раньше неё (`@run-at document-start`). Сбой вставки (Trusted Types, CSP) ядро не роняет: без агента отправка идёт
 * запасным путём.
 */
try {
  injectPageAgent(document, PAGE_AGENT_CODE);
} catch (error) {
  console.warn('[amo-stickers] page agent not injected:', error);
}

/**
 * Ядро — после загрузки DOM, как при запуске на готовом документе: ему нужны `body` и поле ввода.
 */
if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      start(host);
    },
    { once: true }
  );
} else {
  start(host);
}
