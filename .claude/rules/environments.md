---
paths:
  - "/src/userscript/**"
  - "/src/extension/**"
  - "/src/core/host*.ts"
  - "/src/page/index.ts"
  - "/src/page/agent.ts"
---

# Окружения и адаптеры

Контракт `Host`, подключение агента и адаптеры расширения и userscript.

## Host

Ядро знает только `core/host.types.ts`: `Host = { name } & HostNetwork (fetchJson, fetchBlob) & HostSettings
(getSettings, setSettings)`, окружение передаёт его в `start(host)`; импорт окружений в ядро запрещает eslint.

- расширение — сеть через service worker (обход CORS), `chrome.storage.local`;
- userscript с менеджером — `GM_xmlhttpRequest` (обход CORS, без cookie сайтов), `GM_getValue` / `GM_setValue`
  (странице недоступно);
- без менеджера — прямой `fetch` под CORS страницы, `localStorage`.

Заголовок userscript: гранты `GM_*`, `@connect` к хостам сетевой политики, `@sandbox DOM`, `@inject-into content`,
`@run-at document-start`. Матч — `https://*.amo.tm/*`, `localhost` / `127.0.0.1` :3000, :3001 — только в `pnpm watch`;
`@updateURL` / `@downloadURL` на `releases/latest/download/` — только в боевой (в watch менеджер заменил бы dev-сборку).

## Агент в мире страницы

Подключается окружением до `start` (протокол — `send.md`): расширение — `page.js` с `"world": "MAIN"`; userscript (и
без менеджера) — `injectPageAgent`: `PAGE_AGENT_CODE` в `<script>`, удаляемом сразу. Нет агента — запасной путь. Второй
агент (расширение + userscript) гасит `window.__amoStickersPage`, пометку ленты запускает только первый.

**Ранний старт** — иначе ядро Worker-версии не поймать: `"run_at": "document_start"` / `@run-at document-start`,
вставка сразу. `body` и корня ещё может не быть: наблюдатель ленты — на `document`, `injectPageAgent` без `head` и корня
вставляет `<script>` в сам документ. Ядру amo stickers нужны `body` и поле: content script — `document_idle`,
userscript ждёт `DOMContentLoaded`. Userscript, запущенный после страницы, ядро не ловит (`no-core`).

## Адаптеры userscript

Чистые функции, зависимости параметрами (тесты без менеджера): `gmNetwork(request)`, `fetchNetwork()`,
`gmSettings(gmStore, storage)`, `localStorageSettings(storage)`. Режим — только в `src/userscript/index.ts` через
`typeof GM_xmlhttpRequest === 'function'` (и `GM_getValue` / `GM_setValue`): `GM_*` лежат в области скрипта, не в
`window`. `declare const GM_*` — там же, не в `types.d.ts`: ядро не сошлётся на GM API и по ошибке.

Ключ `amo-stickers:settings`, объектом. Нет в менеджере, есть в `localStorage` — первое `getSettings` переносит и
удаляет; битый JSON — удаляется без переноса. Запись с менеджером — только в него.
