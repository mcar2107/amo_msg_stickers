## 1. Конфиги alias

- [x] 1.1 `paths` в `tsconfig.json` для `@core`, `@ui`, `@shared`, `@page`, `@extension`, `@userscript`, `@scripts`, `@tests`; проверка — `pnpm typecheck` зелёный на пробном alias-импорте
- [x] 1.2 alias в `vitest.config.ts` из `paths` `tsconfig.json`; проверка — тест с alias-импортом проходит
- [x] 1.3 esbuild разрешает alias во всех точках входа и вложенных бандлах; проверка — `pnpm build` с alias-импортом в ядре, агенте и Worker-е GIF
- [x] 1.4 `eslint.config.mjs`: группа alias в `simple-import-sort`, запрет `../` и `@core/ui/Picker` в `src/`, границы core / shared / page для alias; проверка — нарушение каждого правила на пробном файле даёт ошибку eslint

## 2. Barrel-ы и импорты

- [x] 2.1 codemod (scratchpad): `index.ts` у каждой папки-модуля, импорты `src/` и `tests/` по таблице design.md; проверка — `rg "from '\.\./" src` пуст, `pnpm typecheck` зелёный
- [x] 2.2 конфликты имён `export *` и циклы значений через barrel устранены; проверка — `pnpm typecheck` без TS2308, скрипт поиска циклов пуст
- [x] 2.3 тесты, которые barrel заставил грузить `convert` / виртуальные модули, подменяют их; проверка — `pnpm test` зелёный
- [x] 2.4 `eslint --fix` и `prettier`; проверка — `pnpm lint` без ошибок и предупреждений

## 3. Проверка структуры и бандлов

- [x] 3.1 `tests/moduleStructure.test.ts`: barrel у каждой папки-модуля, alias ведёт в barrel или файл плоской области; проверка — тест зелёный и падает на пробном deep-import
- [x] 3.2 сравнение бандлов с базой до правки (`TELEGRAM_BOT_TOKEN` и `KLIPY_API_KEY` пробными значениями): токен и ключ только в `content.js` и userscript, `page.js` без ядра, `background.js` без кода Worker-а, размеры в пределах шума
- [ ] 3.3 стенд `pnpm harness`: пикер открывается, стикер и GIF отправляются в трёх разметках amo

## 4. Документация

- [x] 4.1 CLAUDE.md: раздел об импортах (alias, barrel, правило «внутри — относительно»), «Линтинг» — границы в alias-форме, «Тесты» — тест структуры; проверка — описание совпадает с конфигами
