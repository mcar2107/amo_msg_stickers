---
paths:
  - "/**"
  - "/.lintstagedrc.mjs"
  - "/.husky/**"
---

# Линтеры

Конфиги линтеров, поток проверки, запреты, действующие послабления и границы импортов `src/`.

Правила стиля и синтаксиса живут в конфигах, а не в голове:

- `/eslint.config.mjs` — JS/TS (typescript-eslint + prettier + jsdoc + simple-import-sort + unicorn; для `.tsx` —
  react-hooks + jsx-a11y);
- `/.prettierrc` + `/.prettierignore` — форматирование;
- `/tsconfig.json` — строгий TS (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`);
- `/.lintstagedrc.mjs` — `eslint --fix` / `prettier --write` / `ast-grep scan` по staged-файлам;
  `/.husky/pre-commit` — lint-staged + tsc + `vitest --changed` + поиск секретов в staged параллельно;
- проверки сверх eslint — таблица ниже.

## Проверки сверх eslint

Подборка — https://github.com/mokevnin/dev-guardrails. Каждая падает с ненулевым кодом. Бинарные инструменты
(ast-grep, agnix, jactionlint, shellcheck, betterleaks, osv-scanner, lychee) закреплены в `/.mise.toml` и
запускаются через `mise x --`, который доставит недостающий; без mise pre-commit падает с подсказкой. npm-обёртки с
докачкой на `postinstall` не берём. Версии `.mise.toml` Dependabot не поднимает — руками.

| Команда | Что | Конфиг | Где ещё |
|---|---|---|---|
| `pnpm lint:knip` | неиспользуемые файлы, экспорты, типы, зависимости | `/knip.jsonc` | `pnpm lint`, CI `lint` |
| `pnpm lint:sg` | правила проекта ast-grep и тесты правил | `/sgconfig.yml`, `/.ast-grep/` | `pnpm lint`, pre-commit (только `scan` по staged), CI `lint` |
| `pnpm lint:agents` | `CLAUDE.md`, `.claude/rules`, скиллы, хуки, `settings.json` (agnix `--strict`) | `/.agnix.toml` | `pnpm lint`, CI `lint` |
| `pnpm lint:actions` | workflows, composite action, `dependabot.yml`, ShellCheck `run:` | правила по умолчанию | `pnpm lint`, CI `actions` |
| `pnpm size` | бюджет несжатого размера собранных файлов, после `pnpm build` | `/.size-limit.json` | CI `build` |
| `pnpm lint:secrets` | секреты во всей истории git | `/.betterleaks.toml` | pre-commit (staged), CI `secrets` |
| `pnpm lint:deps` | известные уязвимости в lockfile корня и доки | `/osv-scanner.toml` | CI `deps` (только PR) |
| `pnpm lint:links` | внешние ссылки README и доки | `/lychee.toml` | `links.yml` по расписанию |

- **Knip.** Экспорт, нужный только своему файлу, — без `export`; ненужный никому — удаляется. Использование в тестах
  считается использованием. Точки входа esbuild перечислены в конфиге: из `build.mjs` Knip их не берёт.
- **ast-grep.** Правило — парой `<id>` (`.ts`) и `<id>-tsx`: generic-стрелку `<T>(…)` парсер TSX принимает за JSX.
  Правила: `no-iterator-chain` (`filter` / `map` / `flatMap` подряд), `no-hex-color` (+ `-css`), `no-cyrillic-literal`
  (вне `messages.ru.ts`, `throw` и `new …Error`), `no-node-api` (`src/`, `tests/`). `.mjs` разбирается парсером
  TypeScript. Новое правило — с тестом в `.ast-grep/tests/` и снапшотом (`ast-grep test -U`). Известные пропуски:
  цепочка за `!` / `as` / скобками и пары итераторов кроме `filter` / `map` / `flatMap`; цвета `rgb()` / `hsl()`; hex
  ловится и в тексте вида `'Issue #123'` — такую строку выносить в словарь всё равно нужно.
- **Новый `lint:*`** — и в `pnpm lint`, и шагом задания `lint` в `ci.yml` (шаги раздельные, чтобы видеть, что упало).
- **Бюджет размера** — текущий размер плюс ~10 %; рост сверх — подъём бюджета в том же PR, он виден в диффе.
- **Секреты.** Отчёт — с `--redact -v`: файл и строка, значение скрыто.
- **Уязвимости.** Исправление — обновление пакета; иначе исключение с `reason` и `ignoreUntil`.

Исключение из любой проверки — в её конфиге или комментарием-исключением инструмента над строкой (`# jactionlint
ignore=<правило>`) и всегда с причиной.

TypeScript в проекте двух версий: `typescript` (6.x) — только для typescript-eslint, который TS 7 пока не
поддерживает; `typescript-native` (7.x, нативный tsgo) — для проверки типов (`pnpm typecheck`). Бинарь
`node_modules/.bin/tsc` занят одной из них — вызывай через скрипт, а не напрямую.

## Поток проверки

1. **Перед правкой** сомнительного места — открой конфиг и прочитай релевантную секцию. Правил много, и они меняются.
2. **После каждой правки** срабатывает PostToolUse-хук `.claude/hooks/lint.sh`:

   - `eslint` для `.ts/.tsx/.js/.mjs/.cjs` по одному файлу;
   - `tsc --noEmit -p tsconfig.json --incremental` (TS 7) для `.ts/.tsx` — типы по всему проекту (кэш в
     `node_modules/.cache/claude-tsc.tsbuildinfo`, таймаут 90 сек). Ошибки в правленом файле блокируют; ошибки в других
     файлах показываются предупреждением, чтобы не застревать на чужих долгах;
   - `severity: error` в правленом файле → exit 2, правка блокируется, ошибки — в stderr;
   - `severity: warning` → exit 0, предупреждения всё равно в stderr;
   - сбой линтера → exit 1 + диагностика.

3. **Перед завершением задачи** — `pnpm lint` (eslint, tsc, prettier, Knip, ast-grep, agnix, jactionlint
   параллельно) и `pnpm test`; правка зависимостей — ещё `pnpm lint:deps`, правка сборки — `pnpm build && pnpm size`.
   0 errors и 0 warnings в новом коде.

## Запреты

- Не отключать правила через `// eslint-disable*`, `@ts-ignore`, `@ts-expect-error` ради прохождения проверки.
- Не ослаблять и не удалять правила в `eslint.config.mjs` / `tsconfig.json`. Действующие послабления и причины
  перечислены ниже («Послабления») — новые заводятся только с обоснованием там же.
- Не обходить типы через `any`, `as unknown as T`, `@ts-nocheck`.
- Автофиксы допустимы (`eslint --fix`, `prettier --write`), после автофикса — прочитай диф. Исключение —
  `jsdoc/require-jsdoc`: его фикс вставляет пустые заглушки `/** */`, описания пиши руками.
- Если непонятно, как починить правильно, — спроси. Не прячь проблему в TODO.

## Послабления

- `no-undef` выключен для TS: необъявленное имя ловит `tsc`.
- `no-console` разрешает `warn` и `info` наравне с `error`: код исполняется в чужой странице amo, консоль —
  единственный канал диагностики.
- `local/**` игнорируется: каталог в `.gitignore`, в нём локальные заготовки вне tsconfig.
- `jsx-a11y/no-noninteractive-tabindex` разрешает `tabIndex` ещё и у `role="region"`: прокручиваемой области без
  фокусируемых потомков (список паков карточки файла) фокус с клавиатуры нужен явно — в порядок Tab браузер ставит
  её сам только с Chrome 130, а сборка нацелена на Chrome 120.

## Импорты

Alias `eslint.config.mjs` читает из `paths` `tsconfig.json`: новый alias сам попадает в группу `simple-import-sort`
(после пакетов, перед CSS и относительными) и в границы ниже.

Границы `src/` — `no-restricted-imports` (`srcImportRule`); конфиг области заменяет правило целиком, поэтому общие
запреты `src/` входят в правило каждой области:

- весь `src/` — без `..`, `../…`, `./../…` (вверх — только alias; исключение — `../../tailwind.config` в
  `amoDomStyle.ts`) и без `@core/ui/Picker…` (только `@ui`);
- `src/core/**` — без `@userscript/…`, `@extension/…`: ядро знает только `core/host.types.ts` и `shared/pageBridge.ts`;
- `src/shared/**` — только `@shared/…`: его берут ядро, окружения и агент;
- `src/page/**` — только `@page/…`, `@shared/…`, иначе в агента в мире страницы утянется ядро.

Импорты тестов не ограничены (`../build.mjs?raw`, `../docs/…`). `no-duplicate-imports` с `allowSeparateTypeImports`:
импорты одного вида из спецификатора сливаются, `import type` и импорт значений — раздельно.
