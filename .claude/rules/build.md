---
paths:
  - "/build.mjs"
  - "/vitest.config.ts"
  - "/tailwind.config.ts"
  - "/src/types.d.ts"
  - "/src/core/ui/picker.css"
  - "/src/core/builtin*.ts"
  - "/scripts/telegramToken.ts"
  - "/scripts/klipyKey.ts"
  - "/src/extension/manifest.json"
  - "/src/extension/icons/**"
  - "/src/extension/actionIcon.ts"
  - "/src/core/gifWorkerEntry.ts"
---

# Сборка

Плагины esbuild, бандлы строкой, встроенные токен и ключ, хосты watch, метаданные — перед правкой `build.mjs` и его
окружения.

## Плагины и бандлы строкой

**`tailwind`** — `picker.css` через PostCSS по `tailwind.config.ts` (минифицирован, кроме `watch`) строкой (loader
`text`, `declare module '*.css'`); фасад кладёт её `<style>` в shadow root. Классы ищутся в `src/core/ui/**/*.tsx`.
Конфиг и компоненты — в `watchFiles`.

**`bundleCodePlugin`** — модуль `<имя>:code` экспортирует строку с IIFE-бандлом входа:
- `gif-worker:code` (`GIF_WORKER_CODE`) из `gifWorkerEntry.ts`: userscript не подключит отдельный файл Worker-а, ядро
  запускает его из blob URL. Есть в `content.js` и userscript, не в `background.js`. Входы — в `watchFiles`.
- `page-agent:code` (`PAGE_AGENT_CODE`) из `src/page/index.ts` — userscript вставляет его `<script>`; расширению агент
  нужен файлом — `dist/extension/page.js`, отдельная точка входа.

**Vitest** плагинов не знает: `vitest.config.ts` отдаёт оба `:code` пустой строкой (`virtual-code-stubs`) — barrel
тянет все файлы, и тест рядом с импортом конвертации (`@core/sources` → `telegram.ts` → `convert.ts`) упал бы на
импорте. Из пустой строки ничего не запускается: `convert.test.ts` подменяет `frameSink` / `frameSource`,
`telegram.test.ts` — `@core/convert`.

## Хосты и обновление

Боевая сборка — только `https://*.amo.tm/*`; `localhost` / `127.0.0.1` на 3000 и 3001 — лишь в `pnpm watch`.
`@updateURL` / `@downloadURL` (`releases/latest/download/amo-stickers.user.js`) — только в боевой: в `watch` менеджер
заменил бы dev-сборку релизом.

## Встроенные токен Telegram и ключ KLIPY

| | Telegram | KLIPY |
|---|---|---|
| переменная | `TELEGRAM_BOT_TOKEN` | `KLIPY_API_KEY` |
| проверка | `readTelegramToken` (`scripts/telegramToken.ts`): `<цифры>:<строка>` | `readKlipyKey` (`scripts/klipyKey.ts`): `[A-Za-z0-9_-]` |
| `define` | `__TELEGRAM_BOT_TOKEN__` | `__KLIPY_API_KEY__` |
| читатель | `builtinToken.ts` (`BUILTIN_TELEGRAM_TOKEN`) | `builtinKlipyKey.ts` (`BUILTIN_KLIPY_KEY`) |

Края обрезаются, неверный формат роняет сборку текстом без значения; в лог — только «есть / нет». Формат ключа KLIPY
не опубликован — строже проверять нельзя, уронило бы релиз. Без переменной — пустая строка, сборка без встроенного
(локальная, `watch`, PR из форка). Значение — только в бандлах со ссылкой на константу: `content.js` и userscript.
Константу читает один модуль; модули раздельные — тесты GIF подменяют ключ (`vi.mock`), не зная о токене.
`declare const` — в `src/types.d.ts`, `define` пустой строкой — в `vitest.config.ts`. Риск утечки — `external-data.md`,
секреты CI — `ci.md`.

**TypeScript** — `typescript-native` 7.x проверяет типы, `typescript` 6.x — только для typescript-eslint;
`node_modules/.bin/tsc` занят одной из них, поэтому — `pnpm typecheck`.

## Метаданные

- Описание расширения — `__MSG_extDescription__` из `_locales/{ru,en}`, `default_locale: ru`. `_locales` и `icons/`
  копируются при старте сборки — в `watch` правка не подхватится до перезапуска.
- Userscript: `@description` и `@description:en`; `@icon` — иконка 48 px data URI, без похода в сеть.
- Иконка `action` по теме (`actionIcon.ts`): тему видит только страница, поэтому content script шлёт SW
  `amo-stickers:icon-theme` при старте и смене темы → `chrome.action.setIcon` (тёмные — `icons/dark/`). До первого
  сообщения — светлая `default_icon`.
