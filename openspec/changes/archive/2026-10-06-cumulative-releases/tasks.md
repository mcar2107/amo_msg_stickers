## 1. Версия из одного источника

- [x] 1.1 `build.mjs`: версия из `package.json` подставляется в `version` собранного manifest и в `@version` заголовка
  userscript; литерал версии из заголовка удалён. Проверка — `pnpm build`, затем `jq -r .version
  dist/extension/manifest.json` и `rg '@version' dist/amo-stickers.user.js` показывают версию `package.json`
- [x] 1.2 `src/extension/manifest.json`: поле `version` удалено. Проверка — `jq .version src/extension/manifest.json`
  даёт `null`, сборка из 1.1 по-прежнему несёт версию

## 2. Проверка версии

- [x] 2.1 `scripts/version.ts`: `checkVersionGrowth` заменена на `checkVersionNotLower` (ошибка только если версия ниже
  базы), удалены `checkVersionConsistency`, `readBannerVersion`, `hasProductChanges`, `PRODUCT_PATHS` и тип
  `VersionSource` в `version.types.ts`. Проверка — `pnpm typecheck`
- [x] 2.2 `scripts/check-version.mjs`: всегда разбирает формат версии `package.json`, с `--base` — сравнение «не ниже»,
  без разбора изменённых путей. Проверка — `node scripts/check-version.mjs --base origin/master` на ветке проходит;
  с временно выставленной в `package.json` версией `0.1.0` падает с ошибкой «ниже», с `0.19` — с ошибкой формата
- [x] 2.3 `tests/version.test.ts`: тесты удалённых функций убраны, `checkVersionNotLower` покрыт — выше и равна
  проходят, ниже (в том числе `0.9.0` против `0.10.0`) падает, невалидная база бросает. Проверка — `pnpm test`

## 3. Workflow

- [x] 3.1 `release.yml`: ветка «тег уже есть» пишет `::notice::` вместо `::warning::`, комментарии описывают мерж без
  подъёма как штатный. Проверка — чтение диффа
- [x] 3.2 `pages.yml`: триггеры `workflow_call` и `workflow_dispatch` вместо push в `master`, сборка пропускается вне
  `refs/heads/master`, `concurrency` группы `pages` без отмены — на job `deploy`. Проверка — `actionlint`, если он есть,
  иначе чтение диффа
- [x] 3.3 `release.yml`: job `pages` за `release` при `needs.release.outputs.released == 'true'` вызывает `pages.yml` с
  `permissions` `contents: read`, `pages: write`, `id-token: write`. Проверка — `actionlint`, если он есть, иначе
  чтение диффа

## 4. Правила процесса

- [x] 4.1 `.claude/skills/task-workflow/SKILL.md`: шаг 4 без обязательного подъёма версии; новый раздел «Релиз» — PR
  релиза (ветка `release/<версия>`, без issue и спеки, уровень по таблице — наибольший из PR с прошлого тега, команда
  списка PR), хотфикс с подъёмом в самом PR, ручная публикация доки; версия — одно поле `package.json`; шаг 8 без
  довода про лишний подъём версии; список файлов продукта для шага 3 — текстом. Проверка — `rg -n 'три места|PRODUCT_PATHS'
  .claude/skills/task-workflow/SKILL.md` пуст
- [x] 4.2 `CLAUDE.md`: «CI и релизы» (`version`, мерж в `master`, дока), «Воркфлоу задачи», описание `scripts/` —
  по новому порядку. Проверка — `rg -n 'PRODUCT_PATHS|без релиза и подъёма версии|подъём версии и PR' CLAUDE.md` пуст
- [x] 4.3 `docs/README.md`: публикация сайта — по релизу и ручным запуском `pages.yml`. Проверка — чтение диффа

## 5. Итог

- [x] 5.1 `pnpm lint` и `pnpm test` зелёные, `pnpm build` собирает обе цели с версией `package.json`
