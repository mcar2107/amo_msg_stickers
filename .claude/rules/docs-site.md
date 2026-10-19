---
paths:
  - "/docs/**"
  - "/README.md"
  - "/tests/userDocsPages.test.ts"
  - "/src/core/userDocs*.ts"
---

# Дока пользователя (VitePress)

Сайт доки в `docs/`: пакет, конфиг, локали, картинки, typograf.

**Правило: правка страницы доки — в обоих языках одним PR.** Страница без пары на другом языке роняет
`tests/userDocsPages.test.ts`.

## Пакет и конфиг

- Отдельный пакет pnpm со своим lockfile (`vitepress`, `vitepress-plugin-tabs` — точные версии; override
  `@types/markdown-it` в `docs/pnpm-workspace.yaml` сводит их типы): зависимости сайта не в lockfile расширения.
  Корневые `docs:*` — `pnpm -C docs …`. До первого коммита нужен `pnpm -C docs i`: `pnpm typecheck` проверяет и
  `docs/tsconfig.json`.
- `docs/.vitepress/config.mts`: `base: '/amo_msg_stickers/'`, `cleanUrls`, `srcDir` — `docs/content/`,
  `vite.publicDir` — `docs/public/`. Фрагменты `_parts/` подключаются `<!--@include: …-->`, страницами не собираются
  (`srcExclude`).
- Ссылки из интерфейса — `userDocsUrl` (см. `i18n.md`): путь совпадает с `base`, префикс `en` — с `link` локали,
  сверяет тест.

## Языки

- Русский — корень, английский — локаль `en` (`lang: 'en-US'`, `link: '/en/'`) в `docs/content/en/` с теми же путями:
  переключатель языка ведёт на ту же страницу. Фрагменты — `_parts/en/`.
- Меню, сайдбар и подписи темы (`outline`, `docFooter`, `notFound` и прочие) — у каждой локали свои; пункт сайдбара =
  H1 страницы. Поиск индексирует каждую локаль отдельно.
- Английские страницы берут `docs/content/img/` на уровень глубже (`../img/` → `../../img/`, `./img/` → `../img/`),
  без копий; `alt` — по-английски, скрины — с русским интерфейсом (оговорка одна, на `en/index.md`). Названия экранов
  и кнопок — строки `messages.en.ts`. `CopyCode` берёт подписи по `localeIndex`.

## Тема и картинки

- `theme/style.css` подставляет в переменные VitePress токены `tailwind.config.ts` (акцент синий в светлой, бежевый
  в тёмной). Логотипы — `docs/public/logo-{light,dark}.svg`, `logo-hero-{light,dark}.svg`. Установка — `::::tabs`.
- Скрины — `docs/content/img/<раздел>/`: PNG через `pngquant`, личные данные размыты, узкий кадр — `<img>` с `width`;
  видео на главной — WebM и MP4, в README — GIF.
- Скрина ещё нет — комментарий `<!-- скрин: img/<раздел>/<имя>.png — что на нём -->`: картинку на несуществующий
  файл Vite не соберёт.
- `chrome://extensions` и подобные — `<CopyCode>` (`theme/CopyCode.vue`): по ссылке браузер туда не пускает.

## Typograf

Тексты доки и словаря — через typograf символами Unicode, без HTML-сущностей; английские — локаль `en-US`. Страницу —
по тексту, не файлом целиком: иначе ломается markdown (`- ` списков, `::::tabs`, `../` путей); неразрывные пробелы
внутри code-span после прогона убираются.
