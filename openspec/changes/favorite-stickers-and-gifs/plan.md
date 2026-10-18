# План прогона: favorite-stickers-and-gifs

База прогона: `77f84f5f7e1df6569a5428cfbbdb38c1b756d037`
Гейт: `pnpm lint && pnpm test && pnpm build`
Быстрые проверки: `pnpm typecheck`, `pnpm exec vitest --project=unit --run tests/<файл>.test.ts`
Долгие слои: `pnpm build && pnpm harness` + chrome-devtools на `http://localhost:8777/dev/harness.html` — G1, G2, G3,
G4, G5; `pnpm docs:build` — G6
Pre-commit гоняет полный `pnpm typecheck` и `vitest --changed`: каждая группа оставляет типы зелёными, смена
сигнатуры правится у всех вызовов в той же группе.

## Контракты

- **K1 Ключ элемента** — `itemKey(item)` экспорт `src/core/db.ts`: `l:<stickerId>` / `r:<provider>:<id>`, тот же у
  `recent` и `favorites`; «в избранном ли» — только `keys.has(itemKey(item))`. Владелец G1; потребители G2, G3, G4.
- **K2 Запись избранного** — `FavoriteRec = { key, ts } & ({ item: LocalSendItem; sticker: StickerRec } | { item:
  RemoteSendItem })` в `db.types.ts`; `listFavorites()` — от новых к старым по `ts`. Владелец G1; потребители G2–G4.
- **K3 API базы** — `listFavorites`, `putFavorite(item, sticker?)`, `deleteFavorite(item)`, `getFavoriteSticker(id)`,
  `countFavoriteStickers()`; `put` / `delete` идемпотентны. Владелец G1; потребители G2 (контекст, `startMode`).
- **K4 Ошибки базы** — `openDb` бросает `LocalizedError('error.db.blocked')` / `('error.db.outdated')`; тексты в
  `messages.{ru,en}.ts` дословно как в задаче 1.2 — FAQ доки цитирует их. Владелец G1; потребители G2, G6.
- **K5 Строки** — все новые ключи (`error.db.*`, `menu.addFavorite`, `menu.removeFavorite`, `status.favoriteAdded`,
  `status.favoriteRemoved`, `stickers.favorites`, `gifs.favorites`) заводит только G1; остальные группы словари не
  правят. Владелец G1; потребители G2–G4.
- **K6 Контекст** — `useFavoritesContext()` → `{ favorites: FavoriteRec[] | null, keys: Set<string>,
  refreshFavorites(), toggleFavorite(item, sticker?): Promise<boolean> }` (`true` — применилось). Владелец G2;
  потребители G3, G4, G5.
- **K7 Колбэк правки** — ячейки отдают наверх `onFavoriteToggle` одного типа (имя типа и место — G2, по строке jsdoc),
  несущий `sectionId`, ключ ячейки, `item` и у стикера `sticker`; режимы (`StickersMode`, обе ветки `GifView`) — единственное
  место, где зовётся `toggleFavorite`. G3/G4 вешают фокус, G5 — метку прокрутки, сигнатуру не меняют. Владелец G2.
- **K8 Разделы** — `FAVORITE_SECTION_ID = 'favorite'` в `usePickerView/sectionIds.ts`, `RECENT_STICKERS_SHOWN = 14` в
  `feedSections`, `RECENT_LIMIT` (40) не меняется; `FeedSticker.urlKey` — id стикера библиотеки или `fav:<id>`.
  Владелец G3; потребители G5, G6.
- **K9 Разделы GIF** — `FAVORITE_GIF_SECTION_ID` в `gifSections.ts`, `GifSection.kind: 'favorite' | 'recent' |
  'feed'` вместо `isRecent`. Владелец G4; потребители G5.
- **K10 Фокус** — `removalFocus/**` правит только G3; G4 его чистые функции только импортирует, своё — в
  `GifView/useGifRemovalFocus/`. Владелец G3; потребитель G4.
- **K11 Места в коде для CLAUDE.md** — `src/core/ui/Picker/keptScrollTop/` (`keptScrollTop({ prev, next, scrollTop })`),
  `PickerProvider/useFavorites`. Владельцы G2, G5; потребитель G6.

## Группы

### G1 · Хранение и строки · M · волна 1

- Задачи: 1.1, 1.2, 1.3, 2.1
- Зависит от: —
- Файлы: `src/core/db.ts`, `src/core/db.types.ts`, `src/core/app.ts`, `src/core/i18n/messages.{ru,en}.ts`,
  `tests/db.test.ts`, новый `tests/openDb.test.ts`
- Требования: `sticker-library` → «Локальное постоянное хранение»; `favorites` → «Избранное не зависит от недавних и
  паков»
- Design: «Хранилище `favorites` и версия базы 2», «Открытие базы: один запрос на вкладку», «Отправка избранного
  стикера без библиотеки»
- Контракты: вводит K1, K2, K3, K4, K5
- Усиление проверок: 1.1 — ключи сверять с литералами `l:…` / `r:<provider>:…`, а не `itemKey` с `itemKey`;
  1.2 — тест состояния открытия на поддельном `indexedDB` (`vi.stubGlobal`, Web API без Node): `blocked` → отказ
  ожидающим и следующему вызову без второго `open`, затем `success` → соединение; `VersionError` → `outdated`;
  `versionchange` → сброс. Сборку `master` для проверки на стенде — из отдельного worktree базы;
  1.3 — проверка продуктом только после UI (G2+): отправка после удаления пака — в 7.1 (G5)

### G2 · Контекст избранного и меню · M · волна 2

- Задачи: 2.2, 2.3
- Зависит от: G1
- Файлы: `src/core/ui/Picker/PickerProvider/**`, `src/core/ui/Picker/useOpenLoad/**`, `src/core/ui/Picker/Picker.tsx`,
  `src/core/ui/Picker/usePickerView/{startMode,usePickerViewState}.ts`, `src/core/ui/Picker/Menu/CellMenu/**`,
  `src/core/ui/Picker/StickerCell/**`, `src/core/ui/Picker/StickerFeed/{StickerFeed.tsx,StickerFeed.types.ts,FeedRow/**}`,
  `src/core/ui/Picker/MasonryGrid/{MasonryGrid.tsx,MasonryGrid.types.ts,MasonryCell/**}`,
  `src/core/ui/Picker/StickersMode/StickersMode.tsx`, `src/core/ui/Picker/GifView/GifView.tsx`,
  `tests/{startMode,cellMenuItems}.test.ts`
- Требования: `favorites` → «Добавление в избранное и удаление из него»; `picker-states` → «Увеличенный
  предпросмотр» (состав меню); `composer-integration` → «Навигация попапа»
- Design: «Контекст избранного», «Меню ячейки», «Режим первого открытия»
- Контракты: вводит K6, K7, K11 (`useFavorites`); потребляет K1–K5
- Усиление проверок: 2.2 — переход состояния после `toggleFavorite` (записи и ключи после добавления, повтора,
  удаления) вынести чистой функцией с тестом; 2.3 — на стенде пункт есть и переключает статус в паке, недавних
  стикерах, трендах, недавних GIF и в ветке GIF без ключей: беззубо, если колбэк не дошёл до одной из веток

### G3 · Режим «Стикеры» · M · волна 3

- Задачи: 3.1, 3.2, 3.3
- Зависит от: G2
- Файлы: `src/core/ui/Picker/{StickersMode,StickerFeed,SectionTabs,SectionHeader,stickerLayout,removalFocus,useCellSend}/**`,
  `src/core/ui/Picker/StickerCell/StickerCell.types.ts`,
  `src/core/ui/Picker/usePickerView/{sectionIds.ts,usePickerView.types.ts}`,
  `tests/{feedSections,headerAction,removalFocus}.test.ts`
- Требования: `favorites` → «Раздел «Избранное» в режиме «Стикеры»», «Фокус после правки избранного»;
  `sticker-library` → «Недавние», «Паки одной лентой», «Порядок паков по использованию»; `picker-states` →
  «Переключение предпросмотра стрелками»; `sticker-sending` → «Запись в недавние», «Метка в имени файла»
- Design: «Разделы ленты стикеров и лимит недавних», «Фокус после правки избранного», «Object URL снимка»
- Контракты: вводит K8, K10; потребляет K1, K2, K6, K7
- Усиление проверок: 3.2 — на стенде вкладка-звезда с именем «Избранное», у заголовка нет «…», отправка из
  «Избранного» не поднимает пак (порядок вкладок после переоткрытия), стрелки через границу «Избранного»

### G4 · Режим «GIF» · M · волна 3

- Задачи: 4.1, 4.2
- Зависит от: G2
- Файлы: `src/core/ui/Picker/GifView/**`, `src/core/ui/Picker/MasonryGrid/**`, `tests/gifSections.test.ts`
- Требования: `favorites` → «Избранные GIF в режиме «GIF»», «Фокус после правки избранного»; `gif-search` → «Тренды и
  поиск», «Доступные источники»; `picker-states` → «Переключение предпросмотра стрелками» (граница избранного GIF)
- Design: «Избранные GIF», «Фокус после правки избранного»
- Контракты: вводит K9; потребляет K1, K2, K6, K7, K10
- Усиление проверок: 4.2 — чистый выбор цели фокуса по разделам `gifSections` (включая выдачу) — с тестом, иначе
  проверка только стендом; на стенде — избранная GIF тяжелее 2 МБ уходит пережатой

### G5 · Место ленты и итоговая проверка · M · волна 4

- Задачи: 5.1, 5.2, 7.1
- Зависит от: G3, G4
- Файлы: `src/core/ui/Picker/keptScrollTop/**`, `tests/keptScrollTop.test.ts`,
  `src/core/ui/Picker/{StickersMode,StickerFeed,GifView,MasonryGrid,useScrollArea}/**`
- Требования: `favorites` → «Место ленты при правке избранного»; все сценарии из 7.1
- Design: «Удержание места ленты»
- Контракты: вводит K11 (`keptScrollTop/`); потребляет K6–K9
- Усиление проверок: 5.1 — позиции для теста строить помощниками по настоящим раскладкам (`stickerLayout`,
  `splitColumns`), а не руками; 5.2 — на стенде в `requestAnimationFrame` сразу после правки: `scrollTop` сдвинут на
  ожидаемое и в окне есть ряды; 7.1 — отправка избранного стикера после удаления пака и перезагрузки (проверка 1.3)

### G6 · Дока и CLAUDE.md · S · волна 4

- Задачи: 6.1, 6.2
- Зависит от: G3, G4
- Файлы: `docs/content/{usage,privacy,faq,index}.md`, `docs/content/en/{usage,privacy,faq,index}.md`,
  `docs/content/setup/gif-keys.md`, `docs/content/en/setup/gif-keys.md`, `CLAUDE.md`
- Требования: `user-docs` → «Избранное и недавние в доке», «Политика конфиденциальности», «Порядок паков в доке»,
  «Разделы доки»
- Design: «Открытие базы: один запрос на вкладку» (FAQ), «Разделы ленты стикеров и лимит недавних»
- Контракты: потребляет K4, K8, K11
- Усиление проверок: 6.1 — тексты ошибок в FAQ сверить поиском с `messages.{ru,en}.ts`; «14» и «Избранное» /
  «Favorites» на обеих `usage.md`; `pnpm docs:build` и `tests/userDocsPages.test.ts`

## Волны

1. G1
2. G2
3. G3, G4 — файлы не пересекаются (`removalFocus/**` только у G3, K10)
4. G5, G6 — G6 правит только `docs/**` и `CLAUDE.md`
