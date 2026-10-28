## 1. Инструменты и окружение

- [ ] 1.1 `.mise.toml`: `ast-grep`, `agnix`, `jactionlint`, `shellcheck`, `betterleaks`, `osv-scanner`, `lychee` точными версиями; `package.json`: `knip`, `size-limit`, `@size-limit/file` точными версиями; проверка — `mise install` и `pnpm i` без ошибок, `--version` каждого
- [ ] 1.2 `.github/actions/setup`: `mise-action` с `install_args: node pnpm`; проверка — задания CI без новых инструментов их не ставят

## 2. Knip

- [ ] 2.1 `knip.jsonc`: точки входа из `build.mjs`, скрипты, стенд, исключения с причиной (виртуальные `*:code`, `lint-staged`, бинарники доки); проверка — ложных находок нет
- [ ] 2.2 находки исправлены: `export` снят у используемого только в своём файле, неиспользуемое удалено; проверка — `pnpm lint:knip`, `pnpm typecheck`, `pnpm test` зелёные
- [ ] 2.3 скрипт `lint:knip` в `pnpm lint`, шаг в задании `lint`; проверка — пробный неиспользуемый экспорт валит `pnpm lint`

## 3. ast-grep

- [ ] 3.1 `sgconfig.yml`, правила `no-iterator-chain`, `no-hex-color`, `no-cyrillic-literal`, `no-node-api` с областями и исключениями из design.md; проверка — `ast-grep scan` по дереву зелёный
- [ ] 3.2 тесты правил: валидные и невалидные примеры на каждое, снапшоты в git; проверка — `ast-grep test` зелёный, сломанное правило его валит
- [ ] 3.3 скрипт `lint:sg` (scan + test) в `pnpm lint`, staged-файлы в lint-staged, шаг в задании `lint`; проверка — пробный `Buffer.from` в тесте валит коммит

## 4. agnix

- [ ] 4.1 `.agnix.toml`: цель `claude-code`, вне проверки `openspec/**` и генерируемое OpenSpec; кавычки вокруг `$CLAUDE_PROJECT_DIR` в `.claude/settings.json`; проверка — `agnix --strict .` зелёный, хук линта работает
- [ ] 4.2 скрипт `lint:agents` в `pnpm lint`, шаг в задании `lint`; проверка — битый frontmatter пробного правила валит `pnpm lint`

## 5. jactionlint

- [ ] 5.1 все `uses` — по полному SHA с комментарием-тегом; проверка — `unpinned-uses` нет
- [ ] 5.2 остальные находки исправлены по design.md (`persist-credentials`, `timeout-minutes`, `pipefail`, `base_ref` через `env`, секреты стора, cooldown, `author_association` в `claude.yml`, `concurrency`), неисправимые — в `.github/jactionlint.yaml` с причиной; проверка — `jactionlint` зелёный
- [ ] 5.3 скрипт `lint:actions` в `pnpm lint`, задание `actions` в `ci.yml`; проверка — пробный `uses: x/y@v1` валит задание

## 6. size-limit

- [ ] 6.1 `.size-limit.json`: `content.js`, `background.js`, `page.js`, userscript, `brotli: false`, бюджет — текущий размер + ~10 %; проверка — `pnpm build && pnpm size` зелёный
- [ ] 6.2 шаг в задании `build` после сборки; проверка — бюджет ниже размера валит шаг

## 7. Betterleaks

- [ ] 7.1 `.betterleaks.toml`: набор по умолчанию + исключение `key` в manifest; проверка — `betterleaks git .` по всей истории зелёный, пробный токен в файле — находка
- [ ] 7.2 pre-commit: `betterleaks git --pre-commit --staged --redact`, без бинарника — ошибка с `mise install`; скрипт `lint:secrets`; задание `secrets` в `ci.yml` с полной историей; проверка — коммит с пробным токеном отклонён

## 8. OSV-Scanner

- [ ] 8.1 уязвимые транзитивные пакеты корня обновлены в lockfile; `osv-scanner.toml` с исключениями дока (id, причина, `ignoreUntil`); проверка — `pnpm lint:deps` зелёный
- [ ] 8.2 задание `deps` в `ci.yml`; проверка — снятое исключение валит задание

## 9. lychee

- [ ] 9.1 `lychee.toml` (только http/https), скрипт `lint:links`, `links.yml` по расписанию и `workflow_dispatch` с `GITHUB_TOKEN`; проверка — `pnpm lint:links` зелёный, пробная битая ссылка — ошибка

## 10. Документация и итог

- [ ] 10.1 `linting.md`, `ci.md`, блок команд `CLAUDE.md`: новые проверки, где запускаются, `mise install`, исключения; проверка — описание совпадает с конфигами
- [ ] 10.2 итог: `pnpm lint`, `pnpm test`, `pnpm build && pnpm size`, `pnpm lint:secrets`, `pnpm lint:deps`, `pnpm lint:links` зелёные; `prettier --check` по новым конфигам
