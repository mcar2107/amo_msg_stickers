## Why

Часть правил проекта держится на внимательности автора и агента, а не на проверке, которая валит прогон (issue #144):
мёртвые экспорты не видны за barrel-ами `export *`, рост `content.js` (~500 КБ, грузится в каждую вкладку amo) никто не
замечает, action в workflows подключены по тегу, секреты из `.env` и `local/` защищает только `.gitignore`, уязвимости в
lockfile при выключенных major-обновлениях Dependabot не всплывают, внешние ссылки доки не проверяются, а правила
`code-style.md` и `CLAUDE.md` без линтера (цепочки итераторов, hex-цвета, кириллица в коде, Node API) — только текст.

## What Changes

- **Knip** — неиспользуемые файлы, экспорты и зависимости; находки текущего `master` (8 экспортов, 30 типов)
  исправляются.
- **size-limit** — бюджет размера собранных `content.js`, `background.js`, `page.js` и userscript; проверка — в задании
  сборки CI.
- **jactionlint** — workflows, composite action и `dependabot.yml`, со ShellCheck для `run:`; все action закрепляются по
  SHA коммита, остальные находки исправляются или исключаются с причиной в конфиге.
- **agnix** — `CLAUDE.md`, `.claude/rules`, скиллы, хуки и `settings.json`; генерируемые OpenSpec файлы и журналы
  `openspec/` вне проверки.
- **ast-grep** — правила проекта с тестами на сами правила: цепочки итераторов, hex-цвета, кириллица вне словаря и
  ошибок-инвариантов, Node API в `src/` и `tests/`.
- **Betterleaks** — секреты в staged-файлах (pre-commit) и во всей истории git (CI).
- **OSV-Scanner** — известные уязвимости в `pnpm-lock.yaml` и `docs/pnpm-lock.yaml`; уязвимые транзитивные пакеты
  корня обновляются, уязвимости dev-сервера доки без исправления в ветке vite 5 исключаются до срока с причиной.
- **lychee** — внешние ссылки README и доки, по расписанию раз в неделю и вручную, не в PR.
- Версии бинарных инструментов — в `.mise.toml`, npm-инструментов — в `package.json`; каждый запускается локально
  одной командой `pnpm`, быстрые — внутри `pnpm lint`.
- В PR — три новых статуса: `actions`, `secrets`, `deps`.

Поведение продукта не меняется.

## Capabilities

### New Capabilities

- `quality-gates`: какие проверки качества кода, сборки, workflows, конфигов агентов, секретов, зависимостей и ссылок
  есть в проекте, когда они запускаются и что валят.

### Modified Capabilities

- `ci-cd`: «Проверки PR» — девять отдельных проверок вместо шести.

## Impact

- **Код:** снятие `export` или удаление неиспользуемых экспортов в `src/` и `scripts/` по находкам Knip; поведение не
  меняется.
- **Конфиги:** новые `knip.json`, `.size-limit.json`, `sgconfig.yml` и `.ast-grep/`, `.agnix.toml`,
  `.betterleaks.toml`, `osv-scanner.toml`, `lychee.toml`; правки `package.json`,
  `pnpm-lock.yaml`, `.mise.toml`, `.lintstagedrc.mjs`, `.husky/pre-commit`,
  `.claude/settings.json`.
- **CI:** `ci.yml` (задания `actions`, `secrets`, `deps`, бюджет в `build`), новый `links.yml`, правки всех workflows и
  `dependabot.yml` по находкам jactionlint.
- **Зависимости:** dev — `knip`, `size-limit`, `@size-limit/file`; бинарные через mise — `ast-grep`, `agnix`,
  `jactionlint`, `shellcheck`, `betterleaks`, `osv-scanner`, `lychee`. Рабочих зависимостей нет.
- **Правила агентов:** `linting.md`, `ci.md`, команды в `CLAUDE.md`.
- **Версия:** PR версию не поднимает; уровень в релизе — без релиза (CI, инструменты), если правки Knip в `src/` не
  меняют сборку, иначе — патч.
