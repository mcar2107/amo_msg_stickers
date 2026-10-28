---
paths:
  - "/.github/**"
  - "/scripts/**"
  - "/package.json"
---

# CI и релизы

Как устроены workflows, скрипты CI и секреты. Порядок задачи и релиза (PR релиза, уровень версии, хотфикс) — скилл
`.claude/skills/task-workflow/SKILL.md`.

## Устройство

- `.github/actions/setup` — окружение всех заданий: Node и pnpm из `.mise.toml` (`jdx/mise-action` с `install_args:
  node pnpm` плюс вход `tools`, как локально), зависимости корня и доки (`pnpm -C docs install --frozen-lockfile`) —
  без доки eslint и typecheck падают на импорте vitepress. Бинарные инструменты проверок задание ставит явно: `tools`
  setup-а или своим `mise-action` с `install_args`. В `ci.yml` `MISE_EXEC_AUTO_INSTALL=false`: иначе `mise x` в
  скрипте `pnpm` доставил бы все недостающие инструменты `.mise.toml`, а недостающий нужный — ошибка.
- **Action — по полному SHA** с комментарием-тегом (`@<sha> # v7.0.1`): тег можно перенести на другой код, а
  Dependabot обновляет SHA вместе с комментарием. Проверяет `pnpm lint:actions` (jactionlint): ещё
  `persist-credentials: false` у checkout без push, `timeout-minutes` у каждого задания, `concurrency` у каждого
  workflow, pipefail в конвейерах `run:` (`defaults.run.shell: bash`), значения событий в скрипте — только через `env`.
- `scripts/`: чистая логика с тестом — `.ts`, запуск в CI — тонкий `.mjs`: `version.ts` → `check-version.mjs`,
  `chromeWebStore.ts` (API, подпись JWT) → `publish-chrome-web-store.mjs`, `boardMove.ts` →
  `move-issue-in-progress.mjs`. Ещё `telegramToken.ts`, `klipyKey.ts` — для `build.mjs` (см. `build.md`), и
  `init-env.mjs` — `postinstall`: `.env` из `.env.example`, если его нет и это не CI.

## Workflows

- **`ci.yml`, PR в `master`:** статусы `lint` (eslint, prettier, Knip, ast-grep, agnix — шагами с `!cancelled()`),
  `typecheck`, `test` (полный, не `--changed`), `build` (с бюджетом `pnpm size`), `docs` (`docs:build` ловит битые
  ссылки), `version`, `actions` (jactionlint), `secrets` (Betterleaks по всей истории), `deps` (OSV-Scanner по обоим
  lockfile, только в PR: база уязвимостей меняется без коммитов, и релиз от неё не зависит). Новый коммит отменяет старый прогон. Артефакт `build` — `amo-stickers.zip` и `amo-stickers.user.js`
  для проверки до мержа.
- **Встроенные `TELEGRAM_BOT_TOKEN` и `KLIPY_API_KEY`** — секреты в `env` шага `pnpm build`; `release.yml` передаёт их
  в `ci.yml` явно, `ci.yml` объявляет в `workflow_call.secrets`: вызванный workflow секретов не видит, а
  `secrets: inherit` отдал бы проверкам все. Незаданный секрет (форк, Dependabot) — сборка без встроенного значения,
  не падение. Артефакт PR несёт токен — он и так публичен в релизе; в логе только «есть / нет».
- **`version`** (`check-version.mjs --base origin/master`): формат `MAJOR.MINOR.PATCH`, в PR — не ниже `master` (по
  числам); равная проходит. Версия — только в `package.json`, `build.mjs` ставит её в manifest и `@version`.
- **`release.yml`, мерж в `master`:** проверки, тег `v<версия>`, GitHub Release с `amo-stickers.zip` (`manifest.json`
  в корне) и `amo-stickers.user.js`, заметки — автогенерация по PR с прошлого релиза. Прогоны — по одному группой
  `release` с `queue: max`: без очереди GitHub держит один ожидающий прогон и заменяет его новым, и промежуточная
  версия осталась бы без релиза. Имя группы — строка, а не `github.workflow`: в вызванных workflows это имя
  вызывающего, и они ждали бы сами себя. Имена без версии: ссылки
  `releases/latest/download/<файл>` (дока, README, `@updateURL`) не меняются. Тег есть — `::notice::`, прогон зелёный.
  Push мержа без прогона (GitHub теряет событие) — `gh workflow run release.yml --ref master`; с другой ветки прогон
  пропускается.
- **`chrome-web-store.yml`** (job из `release.yml`): zip релиза — в стор на проверку, API v2, сервисный аккаунт,
  версия из manifest архива. Вручную — `gh workflow run chrome-web-store.yml --ref master [-f tag=v<версия>]`, без
  тега — последний релиз. Группа `chrome-web-store` — очередь без вытеснения (`queue: max`, без отмены): без неё
  ожидающий запуск заменялся бы новым, и ручной запуск старого тега отменил бы публикацию новой версии. Секреты стора
  `release.yml` передаёт явно, не `secrets: inherit`. Без секретов `CWS_SERVICE_ACCOUNT_KEY`, `CWS_PUBLISHER_ID`
  — предупреждение, job зелёный. «Re-run failed jobs» безопасен: версию, уже стоящую в сторе, скрипт не грузит. Job
  идёт за релизом этого коммита, даже если тег создала прошлая упавшая попытка; тег на другом коммите стор не трогает.
- **`pages.yml`** (job `pages` из `release.yml`, условие как у стора, коммит релиза): сайт не описывает невыпущенное.
  Вручную (`gh workflow run pages.yml --ref master`) — только если в `master` нет доки о невыпущенном: уходит весь
  `master`. Прогоны — группой `pages` по одному, очередью без отмены: оборванный деплой оставил бы сайт в
  неизвестном состоянии.
- **`claude.yml`:** `@claude` в issue, комментарии или ревью запускает `anthropics/claude-code-action`. Секрет
  `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`); разрешены `pnpm lint`, `test`, `typecheck`, `format`. Запускает
  только `OWNER` / `MEMBER` / `COLLABORATOR` (`author_association`): комментировать публичный репозиторий может любой, а
  job получает токен на запись. На ревью PR checkout берёт merge-коммит PR и исполняет его код — из форка без секретов,
  ветки репозитория пишут только соавторы. Сессии одного issue или PR — очередью без отмены, группой на job-е:
  отсеянный `if` прогон в очередь не встаёт. Инструменты `pnpm lint` ставит setup (`tools`).
- **`board.yml`:** ветка `<type>/<номер issue>-<имя>` переводит карточку на доске
  (`https://github.com/users/mcar2107/projects/1`) из Backlog или Ready в In progress — встроенные workflows доски
  делают это только по PR, а ветка раньше. Прочие статусы, ветку без номера (`release/<версия>`), issue вне доски и
  сбой скрипт пропускает с логом, прогон зелёный. Нужен PAT `PROJECT_TOKEN` (scope `project`): токен прогона доской
  пользователя не управляет; без него — `::warning::`. Ready и In review — руками.
- **`links.yml`:** внешние ссылки README и доки (`pnpm lint:links`, lychee) по понедельникам и вручную
  (`gh workflow run links.yml --ref master`). Не в PR: чужой сайт может лежать час. Упавший прогон приходит письмом.
