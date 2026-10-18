## Why

Импорты между модулями — длинные относительные пути (`../../../core/...` в UI, `../src/core/...` в тестах): переезд
файла ломает десятки импортов, а граница модуля нигде не видна — любой файл берёт любой файл соседнего модуля
напрямую (issue #130).

## What Changes

- Path aliases по областям, одни и те же для проверки типов, сборки esbuild, vitest и eslint: `@core/*` → `src/core/*`,
  `@ui/*` и `@ui` → `src/core/ui/Picker`, `@shared/*`, `@page/*`, `@extension/*`, `@userscript/*`, `@scripts/*` →
  `scripts/*`, `@tests/*` → `tests/*`.
- Barrel `index.ts` у каждой папки-модуля: каталоги компонентов и хуков пикера, подмодули ядра `i18n/`, `libraryFile/`,
  `sources/`, `zip/`, `ui/renderMessage/`, хелперы тестов. Плоские области (`src/core/*.ts`, `src/core/ui/*.tsx`,
  `src/shared`, `src/page`, `src/extension`, `src/userscript`, `scripts`) общего barrel не получают — их файлы берутся
  по одному через alias.
- Правило импортов: внутри модуля и вниз, в его дочерние модули, — относительный путь (дочерний модуль — через его
  barrel); вверх и в соседний модуль — только alias на barrel модуля или на файл плоской области.
- eslint: запрет `../` в `src/`, запрет `@core/ui/Picker/…` вместо `@ui/…`, границы core / shared / page — и для
  alias-импортов; группа alias в `simple-import-sort`.
- Тест структуры: у каждой папки-модуля есть `index.ts`, alias-импорт ведёт в barrel модуля или в файл плоской области.
- CLAUDE.md: раздел об импортах, обновлённое описание границ.

Поведение продукта не меняется.

## Capabilities

### New Capabilities

<!-- Нет: внутренний рефактор, поведение не меняется (skip_specs). -->

### Modified Capabilities

<!-- Нет. -->

## Impact

- **Код:** импорты почти всех файлов `src/` и `tests/`, новые `index.ts` (~180), `tsconfig.json`, `vitest.config.ts`,
  `eslint.config.mjs`, `CLAUDE.md`. `build.mjs` — только если esbuild не подхватит `paths` из `tsconfig.json` сам.
- **Бандлы:** состав как до правки — код Worker-а GIF, встроенные токен бота и ключ KLIPY только в `content.js` и
  userscript, `page.js` без ядра, `background.js` без кода Worker-а; размер — в пределах шума.
- **Зависимости:** новых нет.
- **Версия:** PR версию не поднимает; уровень в релизе — патч (рефактор).
