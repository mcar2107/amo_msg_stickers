## 1. Подготовка

- [x] 1.1 Issue #85 «Подпись источника GIF видна сразу, а не в конце ленты» с меткой `enhancement`, назначена на себя
- [x] 1.2 Ветка `fix/85-gif-attribution-visible` от свежего `master`
- [x] 1.3 Версия `0.18.1` в `package.json` (`pnpm version 0.18.1 --no-git-tag-version`), `src/extension/manifest.json`
  и `@version` в `build.mjs`; проверка: `node scripts/check-version.mjs --base origin/master` — код 0

## 2. Подпись под лентой

- [x] 2.1 Компонент `GifView/FeedAttribution/FeedAttribution.tsx` и `FeedAttribution.types.ts`: таблица
  `FEED_ATTRIBUTION` переезжает из `GifView.tsx`, полоса `shrink-0 px-2.5 py-1 text-right text-xxs`; проверка:
  `pnpm typecheck`
- [x] 2.2 `GifView.tsx`: подпись убрана из `children` `MasonryGrid`, после ленты стоит `<FeedAttribution feed={feed} />`,
  неиспользуемые константы удалены; проверка: `pnpm lint`

## 3. Проверка

- [x] 3.1 Стенд `dev/harness.html`: в режиме «GIF» подпись видна сразу, не прокручивается при долгой прокрутке ленты и
  подгрузке следующих страниц, меняется при смене источника (GIPHY → KLIPY), в светлой и тёмной теме; без ключей
  подписи нет; сценарии `gif-search` («Атрибуция и фильтрация»)
- [x] 3.2 `pnpm lint` и `pnpm test` — без ошибок и предупреждений
