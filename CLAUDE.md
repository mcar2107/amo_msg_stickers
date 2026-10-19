# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Здесь — то, что нужно в любой задаче. Устройство подсистем — в `.claude/rules/*.md` с `paths:`: файл правила
подгружается сам, когда агент работает с его файлами (таблица — «Правила для агентов»).

## Что это

amo stickers — стикеры и GIF для мессенджера amo (web). В строке ввода рядом с кнопкой эмодзи — кнопка стикеров;
наведение или клик открывает попап с режимами «Стикеры» (избранное, недавние, свои стикеры из картинки, GIF, видео или
`.tgs` с подписью, паки из Telegram) и «GIF» (поиск GIPHY и KLIPY, избранные и недавние). Стикер уходит кликом.
Библиотеку — пак или целиком — можно выгрузить файлом `.amostickers` и загрузить в другом браузере.

Публичного API отправки у amo нет, поэтому код живёт внутри чужой страницы и шлёт стикер отдельным сообщением, не трогая
поле ввода: очередью отправки amo (той же, что опрос), а в Worker-версии amo web — командой её ядра страницы. Путь
недоступен — штатный путь пользователя: вставка файла в поле и клик «Отправить» (`send.md`).

Дока пользователя — VitePress из `docs/` на GitHub Pages, `https://mcar2107.github.io/amo_msg_stickers/`, на русском
(корень) и английском (`/en/`); README — вход в неё (`docs-site.md`).

## Стек и команды

TypeScript (strict) + esbuild. UI пикера — Preact (`jsxImportSource: 'preact'`, варианты классов — `cva`), стили —
Tailwind 3 с токенами amo в `tailwind.config.ts`: цвета, шрифты, тени и отступы совпадают с классами страницы amo, и
класс из её вёрстки значит в пикере то же самое. GIF кодирует `gifenc` в Web Worker-е, `.tgs` рендерит `lottie-web`
(light canvas-плеер: без `eval`, который не пропускает CSP расширения). pnpm, версии Node и pnpm — в `.mise.toml`.

```bash
pnpm i                 # ещё и .env из .env.example, если .env нет
pnpm build             # dist/extension/* и dist/amo-stickers.user.js
pnpm watch             # пересборка, inline-sourcemap, хосты localhost:3000 и :3001
pnpm harness           # стенд http://localhost:8777/dev/harness.html
pnpm typecheck         # проверка типов (TS 7): корень и docs/tsconfig.json
pnpm lint              # eslint + typecheck + prettier --check
pnpm lint:fix          # eslint --fix
pnpm format            # prettier --write
pnpm test              # vitest, проект unit
pnpm skills:update     # перегенерация .claude/skills/openspec-* и .claude/commands/opsx
pnpm -C docs i         # зависимости доки — отдельный пакет; нужен до первого коммита (pre-commit гоняет typecheck)
pnpm docs:dev          # дока локально; docs:build падает на битой ссылке; docs:preview
```

Одно ядро (`src/core`) собирается в две цели (`build.mjs`, IIFE, `target: chrome120`): расширение Chrome / Яндекс /
Edge (MV3, `dist/extension/`) и userscript для Tampermonkey (`dist/amo-stickers.user.js`). Различия целей — за
интерфейсом `Host` (`core/host.types.ts`): сеть и настройки (`environments.md`). Боевая сборка работает только на
`https://*.amo.tm/*`. Встроенные токен Telegram-бота и ключ KLIPY приходят из переменных окружения сборки
(`build.md`, риск — `external-data.md`).

TypeScript двух версий: `typescript-native` (7.x) проверяет типы, `typescript` (6.x) нужен только typescript-eslint.
`node_modules/.bin/tsc` занят одной из них — типы только через `pnpm typecheck`.

## Карта кода

```
build.mjs tsconfig.json vitest.config.ts tailwind.config.ts   # сборка и конфиги (build.md)
eslint.config.mjs .prettierrc .lintstagedrc.mjs .husky/       # линтеры и гейт коммита (linting.md)
src/
  core/                 ядро, общее для обеих целей
    app.ts              старт: поля ввода, кнопка, попап, отправка (amo-dom.md, send.md)
    amoDom*.ts          всё знание о DOM amo, три разметки (amo-dom.md); amoDomStyle.ts — стиль ленты (feed-style.md)
    hoverPopup*.ts iconColor*.ts pageEscape*.ts   попап без DOM, цвет иконки, Escape (amo-dom.md)
    sender.ts pageClient*.ts fileName*.ts          отправка и имя файла (send.md, feed-style.md)
    convert.ts sidePick.ts encodeLadder.ts frameSource*.ts gifEncoder.ts frameSink*.ts workerSink*.ts gifWorker*.ts
                        конвертация в GIF (convert.md)
    db.ts packOrder.ts pickerMode.ts importHint.ts pageStorage*.ts   хранение (storage.md)
    net.ts gif.ts tgs.ts sources/ zip/ libraryFile/   сеть, проверка данных, файл выгрузки (external-data.md)
    host*.ts builtin*.ts                         контракты окружения, встроенные ключи
    i18n/ userDocs*.ts packTitle.ts              язык интерфейса, ссылки на доку (i18n.md)
    packLink.ts clipboard.ts download.ts         мелкие утилиты
    ui/                 пикер: createPicker.tsx — фасад, Picker/ — компоненты (picker*.md)
  extension/            content script, service worker, manifest, _locales, icons (environments.md)
  userscript/           выбор режима по GM API, адаптеры сети и настроек, внедрение агента (environments.md)
  page/                 агент в мире страницы: отправка и пометка ленты (send.md)
  shared/               чистые модули ядра, окружений и агента: протокол агента, пометка стикера, гарды
  types.d.ts            модули без типов, флаги window, константы сборки
dev/                    стенд (harness.md)
docs/                   дока пользователя (docs-site.md)
scripts/                скрипты сборки и CI (ci.md)
tests/                  юнит-тесты, helpers/ (testing.md)
.github/                CI, релиз, стор, Pages, доска (ci.md)
openspec/               specs/ — действующие требования; changes/ — задачи; changes/archive/ — закрытые
local/  CLAUDE.local.md локальные заготовки и заметки; в .gitignore
```

### Импорты и модули

Alias — по областям, единственный источник — `paths` в `tsconfig.json`: `@core/*` → `src/core/`, `@ui` и `@ui/*` →
`src/core/ui/Picker/`, `@shared/*`, `@page/*`, `@extension/*`, `@userscript/*`, `@scripts/*`; у `tests/` alias нет.
`@ui` ведёт в `Picker/index`, а не в каталог: на macOS без учёта регистра `Picker` разрешился бы в `picker.css`. esbuild,
vitest (`resolve.tsconfigPaths`) и eslint берут alias оттуда же.

Плоские области — `src/`, `src/core/`, `src/core/ui/`, `src/shared/`, `src/page/`, `src/extension/`, `src/userscript/`,
`scripts/`, `tests/`: файлы лежат рядом, barrel-а нет. Любой другой каталог с кодом — модуль с barrel-ом `index.ts`,
который реэкспортирует только свои файлы (`export * from './X'`, у `*.types.ts` — `export type *`, у `.types.ts` с
гардами — `export *`). Дочерние модули barrel не реэкспортирует: тянул бы всё поддерево и давал циклы.

**Правило: граница модуля — barrel.**

| Цель | Импорт |
|---|---|
| файл того же каталога | `./X` |
| модуль ниже по дереву | `./child`, `./a/b` — его barrel |
| модуль в другом месте | `@ui/Menu`, `@core/libraryFile` — его barrel |
| файл плоской области в другом каталоге | `@core/sender`, `@shared/pageBridge`, `@core/ui/createPicker` |

`../` в `src/` нет: вверх — только alias (исключение — `../../tailwind.config` в `amoDomStyle.ts`, конфиг вне
областей). UI пикера снаружи — только `@ui…`. Свой barrel изнутри модуля не импортируется; дочерний модуль берёт
родителя через его barrel, обычно `import type`. Цикл значений через barrel рвётся переносом общего кода в дочерний
модуль. `vi.mock` / `vi.doMock` подменяют только файл плоской области (`@core/convert`, `@core/db`), а не barrel: соседи
внутри модуля берут файлы мимо barrel-а. Проверяют eslint и `tests/moduleStructure.test.ts`.

## Сквозные правила

- **Строки интерфейса — только через словарь.** Любой видимый или слышимый текст (подпись, плейсхолдер, `aria-label`,
  `title`, статус, ошибка) — ключ парой в `messages.ru.ts` и `messages.en.ts`, показ через `t` или `renderMessage` в
  рендере или в момент броска, не литералом и не в константе модуля (`i18n.md`). Кириллица вне комментариев в `src/`
  остаётся только в `messages.ru.ts`, `_locales/ru/` и ошибках-инвариантах для разработчика.
- **Цвета — только токены `tailwind.config.ts`**, без hex-литералов и inline-цветов.
- **Без Node API в TypeScript.** `src/` и `tests/` не используют `node:*`, `Buffer`, `process`, `__dirname`: типов Node
  в проекте нет (`types: ["chrome"]`). Вместо них — Web API (`crypto.subtle`, `atob`, `TextEncoder`,
  `CompressionStream`), файлы — `import.meta.glob` и `?raw`. Локальный `pnpm typecheck` нарушение может пропустить
  (типы Node подтягиваются транзитивно), падает CI. Node API — только в `.mjs` вне проверки типов.
- **Что писать об amo.** В публичных файлах (код, комментарии, тесты, дока, OpenSpec, CLAUDE.md и правила) — только
  наблюдаемое поведение страницы и то, что видно в её бандле и рантайме (`sendRequest`, `reduxStore`, `state.dialogs`):
  без путей к исходникам amo web и имён его внутренних функций. Заметки по исходникам — в `CLAUDE.local.md`.
- **Правка страницы доки — в обоих языках одним PR** (`docs-site.md`).
- **Тесты.** Логика ядра, скриптов сборки и CI — юнит-тестами vitest, DOM amo и отправка — на стенде и в живом amo
  (`testing.md`, `harness.md`); перед PR — `pnpm lint` и `pnpm test`: гейт коммита их не заменяет (`linting.md`).

## Воркфлоу задачи

Одна задача — один issue, одна ветка, один PR: issue → ветка от `master` → спека OpenSpec, если задача меняет файлы
продукта (`src/`, `build.mjs`, `tailwind.config.ts`, `tsconfig.json`, `package.json`, `pnpm-lock.yaml`) → правки и PR
без подъёма версии → аудит inline-комментами → правки → повторный аудит и резолв → архив OpenSpec → мерж. Релиз —
отдельный PR `release/<версия>`. Подробности — проектный скилл `task-workflow`: любая задача с правками в репозитории
начинается с него, до первой правки.

Скилы и команды OpenSpec генерирует CLI закреплённой версии (`@fission-ai/openspec` в devDependencies): перегенерация —
только `pnpm skills:update`, не глобальный `openspec update`; обновление — подъём версии пакета и `pnpm skills:update`
одним PR. Набор workflow — из глобального профиля OpenSpec (`openspec config profile`), в репозитории его не закрепить.

## Правила для агентов

`.claude/rules/*.md` подгружаются по `paths:` из frontmatter. Новое знание о подсистеме пишется в её файл правила, а не
в CLAUDE.md; новый файл правила — строкой в эту таблицу.

| Файл | О чём |
|---|---|
| `code-style.md`, `naming.md`, `comments.md`, `linting.md` | стиль, именование, комментарии, линтеры и их послабления — на любой файл |
| `typescript.md` | типы, `as`, jsdoc на полях |
| `react.md`, `react-architecture.md` | UI на Preact: компоненты, хуки, хендлеры, `FC<Props>` |
| `testing.md` | vitest, что покрывается тестами, тест структуры модулей |
| `amo-dom.md` | встраивание в amo: кнопка, попап наведением, три разметки amo web |
| `feed-style.md` | имя отправляемого файла, пометка строк, CSS своих сообщений в ленте |
| `send.md` | отправка: очередь amo, ядро страницы Worker-версии, запасной путь |
| `environments.md` | `Host`, расширение и userscript, агент в мире страницы, ранний старт |
| `picker.md` | пикер: shadow root, фасад, режимы, экраны и формы, движение, ARIA, тема |
| `picker-add.md` | «Добавить стикеры», импорт из Telegram и файла, выгрузка, «Настройки» |
| `picker-feeds.md` | ленты стикеров и GIF, порядок паков, виртуализация, меню, избранное, фокус |
| `picker-preview.md` | предпросмотр |
| `i18n.md` | язык интерфейса, словари, ошибки через границу SW |
| `build.md` | esbuild-плагины, CSS и Worker строкой, встроенные ключи, метаданные сборок |
| `convert.md` | конвертация в GIF |
| `storage.md` | IndexedDB, избранное, запись импорта, `localStorage` страницы |
| `external-data.md` | сетевая политика, лимиты, гарды, файл выгрузки как недоверенные данные |
| `docs-site.md` | дока VitePress |
| `harness.md` | стенд `dev/harness.html` |
| `ci.md` | GitHub Actions, релиз, стор, Pages, доска |
