## Context

Мотивация — proposal.md («Why»), требования — `specs/quality-gates` и дельта `specs/ci-cd`.

Сейчас: `pnpm lint` — eslint, typecheck и prettier через `concurrently`; pre-commit — lint-staged, typecheck и
`vitest --changed`; CI — задания `lint`, `typecheck`, `test`, `build`, `docs`, `version`, у всех окружение из
`.github/actions/setup` (`jdx/mise-action` ставит Node и pnpm из `.mise.toml`). Прогон инструментов по `master` до
правок:

| Инструмент | Находки |
|---|---|
| Knip | 8 неиспользуемых экспортов, 30 экспортных типов; ложные: `lint-staged`, виртуальные `gif-worker:code` и `page-agent:code`, бинарники `dev` / `preview` из скриптов доки |
| jactionlint | теги вместо SHA во всех `uses`, `persist-credentials`, `timeout-minutes`, `concurrency`, `pipefail` в трёх `run:`, `github.base_ref` в скрипте, `secrets: inherit` у стора, cooldown Dependabot 5 < 7, `issue_comment` в `claude.yml` |
| agnix | хук в `settings.json` без кавычек вокруг `$CLAUDE_PROJECT_DIR`; ложные — журналы `openspec/changes/archive` и сгенерированный скилл `openspec-explore` |
| ast-grep (пробы) | цепочек итераторов — 0; кириллица — только в `throw`; Node API в `src/` и `tests/` — 0; hex — `convert.ts` (подпись GIF) и маска `.scroll-fade` |
| Betterleaks | история — одна: поле `key` в `src/extension/manifest.json` (публичный ключ расширения) |
| OSV-Scanner | корень — `vite` 8.3.0, `zod` 4.6.5, `postcss-selector-parser` 6.1.4 (исправления в тех же диапазонах); дока — `vite` 5.4.21 и `esbuild` 0.21.5 из `vitepress` 1.6.4, исправлений в ветке vite 5 нет |
| lychee | 0 битых внешних ссылок |

## Goals / Non-Goals

**Goals:** все восемь проверок проходят на ветке и валят прогон на нарушении; одна команда на проверку локально.

**Non-Goals:** замена eslint / prettier (Oxlint), husky (hk), Dependabot (Renovate); порог покрытия; браузерные тесты
доступности; `??` без комментария — правило требует разбора комментариев, ast-grep его надёжно не выразит.

## Decisions

### Версии: JS-инструменты — npm, бинарные — mise

`knip`, `size-limit`, `@size-limit/file` — devDependencies: они на Node и читают проект. `ast-grep`, `agnix`,
`jactionlint`, `shellcheck`, `betterleaks`, `osv-scanner`, `lychee` — в `.mise.toml`, рядом с Node и pnpm. npm-пакеты
`@ast-grep/cli` и `agnix` — обёртки, которые на `postinstall` докачивают тот же бинарник: ещё два скрипта установки в
`allowBuilds` и сеть на каждом `pnpm i`. mise ставит бинарник из релиза по закреплённой версии и в CI работает тем же
`jdx/mise-action`.

Альтернатива — Docker-образы и официальные action каждого инструмента: в CI быстро, но локально другая команда и
другая версия, а спека требует одного результата.

### Окружение CI ставит только Node и pnpm

`.github/actions/setup` передаёт `mise-action` `install_args: node pnpm` и инструменты из своего входа `tools`, иначе
каждое задание качало бы все семь бинарников. Задание с инструментом ставит его явно: через `tools` setup-а (`lint`) или
своим `mise-action` (`actions`, `secrets`, `deps`). `MISE_EXEC_AUTO_INSTALL=false` в `ci.yml`: иначе `mise x` в
скрипте `pnpm` доставил бы все недостающие инструменты `.mise.toml`.

### Где запускается каждая проверка

| Проверка | Локально | Pre-commit | CI |
|---|---|---|---|
| Knip | `pnpm lint:knip` в `pnpm lint` | — | задание `lint` |
| ast-grep | `pnpm lint:sg` (`scan` + `test`) в `pnpm lint` | `ast-grep scan` по staged через lint-staged | `lint` |
| agnix | `pnpm lint:agents` в `pnpm lint` | — | `lint` |
| jactionlint | `pnpm lint:actions` в `pnpm lint` | — | новое `actions` |
| size-limit | `pnpm size` после `pnpm build` | — | `build`, после сборки |
| Betterleaks | `pnpm lint:secrets` | `betterleaks git --pre-commit --staged` | новое `secrets`, вся история |
| OSV-Scanner | `pnpm lint:deps` | — | новое `deps`, только в PR |
| lychee | `pnpm lint:links` | — | новый `links.yml`: раз в неделю и вручную |

Knip, ast-grep и agnix — шагами задания `lint` с `if: !cancelled()`, как prettier: одна упавшая не прячет остальные,
статус в PR тот же. Секреты, уязвимости и workflows — свои задания: им не нужны `node_modules`, а отдельный статус
сразу говорит, что упало. Секреты и уязвимости в `pnpm lint` не входят: первому нужна вся история, второму — сеть.

### Knip: исправлять, а не глушить

Экспорт, который используется только в своём файле, теряет `export`; неиспользуемый нигде — удаляется. Конфиг —
`knip.jsonc`, чтобы причины исключений лежали рядом: точки входа из `build.mjs` (esbuild Knip не читает), виртуальные
модули `*:code` из плагинов `build.mjs`, `lint-staged` (зовётся из `.husky/pre-commit`), бинарники скриптов доки —
отдельного проекта pnpm, который Knip не проверяет.

### size-limit: несжатый размер, запас ~10 %

`brotli: false`: расширение и userscript ставятся с диска, по сети сжатыми не ходят, а время разбора растёт с
несжатым размером. Бюджет — текущий размер плюс ~10 %, округлённый вверх до 10 КБ, у файлов меньше 100 КБ — до 1 КБ:
запас на мелкие правки, большой рост виден в PR.

### jactionlint: исправить всё, что не меняет задуманное поведение

- `uses` — полный SHA и комментарий с тегом: Dependabot (`github-actions`) обновляет такие закрепления сам.
- `persist-credentials: false` — у checkout без последующего `git push`.
- `timeout-minutes` у каждого задания; `set -o pipefail` в скриптах с конвейером; `github.base_ref` — через `env`.
- Стору — только `CWS_SERVICE_ACCOUNT_KEY` и `CWS_PUBLISHER_ID` вместо `secrets: inherit`.
- Cooldown Dependabot 7 дней: за неделю скомпрометированный релиз пакета обычно успевают отозвать.
- `claude.yml`: в условие — `author_association` комментатора из `OWNER` / `MEMBER` / `COLLABORATOR`. Правило
  `dangerous-triggers` условия не читает и срабатывает и после этого — исключение комментарием
  `# jactionlint ignore=dangerous-triggers` над триггером, с причиной.
- `concurrency`: у `board.yml` — группа по ветке с отменой. У `release.yml`, `chrome-web-store.yml`, `pages.yml` и
  `claude.yml` (по issue / PR) — группа без отмены с `queue: max` (очередь до 100 прогонов, GitHub, май 2026): без
  очереди ожидающий прогон GitHub заменяет новым, и релиз промежуточного коммита потерялся бы (`ci.md`). Имена групп —
  строки, а не `github.workflow`: в вызванном workflow это имя вызывающего. Группа `pages` переезжает с задания деплоя
  на workflow: одно имя на двух уровнях — прогон ждал бы сам себя.

Исключение — комментарием инструмента над строкой: оно точнее, чем выключение правила в конфиге, и причина лежит
рядом. Конфига jactionlint нет — профиль по умолчанию.

### agnix: строгий режим, генерируемое — вне проверки

`.agnix.toml`: цель `claude-code`; вне проверки `openspec/**` (журналы и спеки — не конфиг агента),
`.claude/skills/openspec-*` и `.claude/commands/opsx/**` (генерирует `pnpm skills:update`, ручная правка затрётся).
Запуск с `--strict`: предупреждение тоже валит, иначе предупреждения копятся.

### ast-grep: правила и их область

`sgconfig.yml`, правила в `.ast-grep/rules/`, тесты в `.ast-grep/tests/` со снапшотами в git.

| Правило | Область | Исключение |
|---|---|---|
| `no-iterator-chain` — `filter` / `map` / `flatMap`, за которым сразу `filter` / `map` / `flatMap` | `src`, `scripts`, `tests`, `dev` | — |
| `no-hex-color` — hex в строке или в значении CSS | `src` | `convert.ts`: цвет подписи впечатывается в пиксели GIF и от темы не зависит; маска `.scroll-fade` — у `mask-image` значим только альфа-канал |
| `no-cyrillic-literal` — кириллица в строке, шаблоне, JSX-тексте | `src` | `messages.ru.ts`; литерал внутри `throw` или `new …Error` — ошибка-инвариант для разработчика |
| `no-node-api` — `process`, `Buffer`, `__dirname`, `__filename`, `require`, импорт `node:*` | `src`, `tests` | — |

### Betterleaks: правила по умолчанию плюс одно исключение

`.betterleaks.toml` расширяет набор по умолчанию и исключает строку `"key"` в `src/extension/manifest.json`: публичный
ключ, по которому Chrome даёт расширению постоянный id, — не секрет. Отчёт — с `--redact`. Pre-commit без бинарника
падает с подсказкой `mise install`: молча пропущенная проверка секретов хуже упавшего коммита.

### OSV-Scanner: исправить корень, исключить дев-сервер доки до срока

Корень — `pnpm update` уязвимых транзитивных пакетов в пределах диапазонов. Дока: уязвимости `vite` 5 и `esbuild` 0.21
касаются dev-сервера, а дока в CI только собирается статикой; исправлений в ветке vite 5 нет, а `vitepress` 2 —
альфа. Исключения в `osv-scanner.toml` с `ignoreUntil` через три месяца и причиной. Один конфиг на оба lockfile —
флагом `--config`, иначе сканер искал бы конфиг рядом с каждым lockfile.

### lychee: только внешние ссылки, не в PR

`--scheme https --scheme http`: внутренние ссылки доки уже проверяет `docs:build`. Запуск по расписанию и вручную:
внешний сайт может лежать час, и PR из-за этого не должен краснеть. Запросы к GitHub — с `GITHUB_TOKEN`, иначе лимит
анонимных запросов.

## Risks / Trade-offs

- [Dependabot не обновляет `.mise.toml`] → версии бинарных инструментов поднимаются руками; поддерживает ли
  Dependabot mise — не проверено.
- [Новая уязвимость в базе краснит все PR] → так и задумано: исправление — обновление пакета или исключение с
  причиной и сроком в том же PR.
- [Pre-commit требует `mise install`] → сообщение с командой; `ci.md` и `linting.md` это описывают.
- [agnix `--strict` на новой версии даёт новые предупреждения] → версия закреплена, подъём — отдельным PR с правками.

## Migration Plan

Один PR. Откат — revert: проверки не трогают сборку продукта, кроме снятых Knip экспортов, которые на поведение не
влияют.
