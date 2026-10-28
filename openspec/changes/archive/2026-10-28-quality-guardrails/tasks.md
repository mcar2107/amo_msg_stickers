## 1. Инструменты и окружение

- [x] 1.1 `.mise.toml`: `ast-grep`, `agnix`, `jactionlint`, `shellcheck`, `betterleaks`, `osv-scanner`, `lychee` точными версиями; `package.json`: `knip`, `size-limit`, `@size-limit/file` точными версиями; проверка — `mise install` и `pnpm i` без ошибок, `--version` каждого
- [x] 1.2 `.github/actions/setup`: `mise-action` с `install_args: node pnpm`; проверка — задания CI без новых инструментов их не ставят

## 2. Knip

- [x] 2.1 `knip.jsonc`: точки входа из `build.mjs`, скрипты, стенд, исключения с причиной (виртуальные `*:code`, `lint-staged`, бинарники доки); проверка — ложных находок нет
- [x] 2.2 находки исправлены: `export` снят у используемого только в своём файле, неиспользуемое удалено; проверка — `pnpm lint:knip`, `pnpm typecheck`, `pnpm test` зелёные
- [x] 2.3 скрипт `lint:knip` в `pnpm lint`, шаг в задании `lint`; проверка — пробный неиспользуемый экспорт валит `pnpm lint`

## 3. ast-grep

- [x] 3.1 `sgconfig.yml`, правила `no-iterator-chain`, `no-hex-color`, `no-cyrillic-literal`, `no-node-api` с областями и исключениями из design.md; проверка — `ast-grep scan` по дереву зелёный
- [x] 3.2 тесты правил: валидные и невалидные примеры на каждое, снапшоты в git; проверка — `ast-grep test` зелёный, сломанное правило его валит
- [x] 3.3 скрипт `lint:sg` (scan + test) в `pnpm lint`, staged-файлы в lint-staged, шаг в задании `lint`; проверка — пробный `Buffer.from` в тесте валит коммит

## 4. agnix

- [x] 4.1 `.agnix.toml`: цель `claude-code`, вне проверки `openspec/**` и генерируемое OpenSpec; кавычки вокруг `$CLAUDE_PROJECT_DIR` в `.claude/settings.json`; проверка — `agnix --strict .` зелёный, хук линта работает
- [x] 4.2 скрипт `lint:agents` в `pnpm lint`, шаг в задании `lint`; проверка — битый frontmatter пробного правила валит `pnpm lint`

## 5. jactionlint

- [x] 5.1 все `uses` — по полному SHA с комментарием-тегом; проверка — `unpinned-uses` нет
- [x] 5.2 остальные находки исправлены по design.md (`persist-credentials`, `timeout-minutes`, `pipefail`, `base_ref` через `env`, секреты стора, cooldown, `author_association` в `claude.yml`, `concurrency`), неисправимые — комментарием `# jactionlint ignore=<правило>` над строкой с причиной; проверка — `jactionlint` зелёный
- [x] 5.3 скрипт `lint:actions` в `pnpm lint`, задание `actions` в `ci.yml`; проверка — пробный `uses: x/y@v1` валит задание

## 6. size-limit

- [x] 6.1 `.size-limit.json`: `content.js`, `background.js`, `page.js`, userscript, `brotli: false`, бюджет — текущий размер + ~10 %; проверка — `pnpm build && pnpm size` зелёный
- [x] 6.2 шаг в задании `build` после сборки; проверка — бюджет ниже размера валит шаг

## 7. Betterleaks

- [x] 7.1 `.betterleaks.toml`: набор по умолчанию + исключение `key` в manifest; проверка — `betterleaks git .` по всей истории зелёный, пробный токен в файле — находка
- [x] 7.2 pre-commit: `betterleaks git --pre-commit --staged --redact`, без бинарника — ошибка с `mise install`; скрипт `lint:secrets`; задание `secrets` в `ci.yml` с полной историей; проверка — коммит с пробным токеном отклонён

## 8. OSV-Scanner

- [x] 8.1 уязвимые транзитивные пакеты корня обновлены в lockfile; `osv-scanner.toml` с исключениями дока (id, причина, `ignoreUntil`); проверка — `pnpm lint:deps` зелёный
- [x] 8.2 задание `deps` в `ci.yml`; проверка — снятое исключение валит задание

## 9. lychee

- [x] 9.1 `lychee.toml` (только http/https), скрипт `lint:links`, `links.yml` по расписанию и `workflow_dispatch` с `GITHUB_TOKEN`; проверка — `pnpm lint:links` зелёный, пробная битая ссылка — ошибка

## 10. Документация и итог

- [x] 10.1 `linting.md`, `ci.md`, блок команд `CLAUDE.md`: новые проверки, где запускаются, `mise install`, исключения; проверка — описание совпадает с конфигами
- [x] 10.2 итог: `pnpm lint`, `pnpm test`, `pnpm build && pnpm size`, `pnpm lint:secrets`, `pnpm lint:deps`, `pnpm lint:links` зелёные; `prettier --check` по новым конфигам
