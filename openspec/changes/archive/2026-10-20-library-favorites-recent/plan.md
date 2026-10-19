# План прогона: library-favorites-recent

База прогона: `dff73ada2325e6f4072f7df1466eb7b024b12247`
Гейт: `pnpm lint && pnpm test`
Быстрые проверки: `pnpm typecheck`, `pnpm exec vitest --project=unit --run tests/<файл>.test.ts`
Долгие слои: `pnpm docs:build` — G5; `pnpm build` + `pnpm harness` (стенд, chrome-devtools) — G6
Хук коммита: полный `pnpm typecheck` и `vitest --changed` — каждая группа оставляет типы и тесты зелёными; новые поля
типов — только добавлением, потребители следующих волн их пока игнорируют.

## Контракты

- **K1 Разделы описания** — `ManifestFavorite`, `ManifestRecent`, `ManifestGif` в `manifest.types.ts`;
  `LibraryManifest.favorites?` / `recent?` от новых к старым; `parseManifest` отдаёт уже очищенные разделы (ссылки вне
  паков файла выкинуты, недавние урезаны до `RECENT_LIMIT` на вид). Владелец G1; потребители G2, G3, G4.
- **K2 Ключ элемента файла** — G1 вводит в `libraryFile/` перевод элемента раздела в `SendItem` (ключ — `itemKey` из
  `@core/db`); выгрузка G2 пишет `ManifestGif` из `item.gif` так, чтобы перевод обратно давал тот же `itemKey`.
  Владелец G1; потребители G2, G3, G4.
- **K3 entries снимков** — `LibraryFile.entries` по id несёт и записи GIF снимков избранного. Владелец G1; потребитель G3.
- **K4 mergeRecent** — чистая `mergeRecent(existing, incoming)` в `libraryFile/`: что `put`, какие ключи удалить, какие
  элементы файла добавились; одна для карточки и записи. Владелец G1; потребители G3, G4.
- **K5 FileCard** — `newFavorites`, `recentAdds`, `newFavoriteCount`, `newRecentCount`; «всё уже в библиотеке» и ранний
  конец `runFileImport` — `newStickerCount + newFavoriteCount + newRecentCount === 0`. Владелец G3; потребитель G5.
- **K6 ImportPlan** — `favorites: ImportPlanFavorite[]` (снимок — проверенный `ImportPlanSticker` + `packId`),
  `recent: ManifestRecent[]`. Владелец G3; потребитель G4.
- **K7 ImportWritten** — `favoriteCount`, `recentCount` и признак добавленных избранных стикеров и недавних стикеров
  (не GIF) для выбора раздела. Владелец G4; потребитель G5.
- **K8 Ключи словаря** — `error.libraryFile.favoriteGifTooBig` и строки группы «Библиотека» (G2),
  `add.file.listsSummary` (G3), `status.fileImportListsDone` (G5) — парой в `messages.ru.ts` / `messages.en.ts`.

## Группы

### G1 · Формат файла и слияние недавних · M · волна 1

- Задачи: 1.1, 1.2, 3.1
- Зависит от: —
- Файлы: `src/core/libraryFile/{manifest.types,limits,readLibraryFile,readLibraryFile.types,index}.ts`,
  `src/core/libraryFile/mergeRecent*.ts`, `tests/libraryManifest.test.ts`, `tests/libraryRead.test.ts`,
  `tests/mergeRecent.test.ts`
- Требования: `library-transfer` → «Загрузка избранного и недавних» (проверка разделов, объединение недавних)
- Design: «Описание», «Гард разделов», «Карточка» (только `mergeRecent`)
- Контракты: вводит K1, K2, K3, K4
- Усиление проверок: 1.1 — чужой хост отдельно в `url` и в `previewUrl`; недавние >40 вперемешку по `ts` — остаются
  самые поздние, а не первые по массиву; 3.1 — сценарий спеки «30 своих + 30 более ранних из файла → 40, 10 из файла»
  с явными ожидаемыми ключами.

### G2 · Выгрузка · M · волна 2

- Задачи: 2.1, 2.2
- Зависит от: G1
- Файлы: `src/core/libraryFile/exportLibrary*.ts`, `src/core/db.ts`, `src/core/ui/Picker/SettingsView/LibraryExport/**`,
  `src/core/i18n/messages.{ru,en}.ts`, `tests/libraryExport.test.ts`, `tests/runLibraryExport.test.ts`, `tests/db.test.ts`
- Требования: `library-transfer` → «Избранное и недавние в файле библиотеки», «Выгрузка библиотеки», «Состав файла»
- Design: «Выгрузка»
- Контракты: потребляет K1, K2; вводит K8 (свои ключи)
- Усиление проверок: 2.1 — круговой тест проверяет и сырой `manifest.json` (у ссылки нет `file`, у снимка запись
  `stickers/<n>.gif` есть) и итог `writeImport` в `fake-indexeddb`, а не только `parseManifest` того же кода;
  2.2 — `countExportable` на `fake-indexeddb` (только избранные GIF → >0, только недавний стикер без стикеров → 0);
  `rg useStickerCount src` пуст.

### G3 · Карточка и план импорта · M · волна 3

- Задачи: 3.2, 3.3
- Зависит от: G1
- Файлы: `src/core/libraryFile/{readLibraryFile,readLibraryFile.types,prepareImport,prepareImport.types}.ts`,
  `src/core/db.ts`, `src/core/ui/Picker/AddView/FileTransfer/ImportCard/**`,
  `src/core/ui/Picker/PickerProvider/runFileImport/**`, `src/core/i18n/messages.{ru,en}.ts`,
  `tests/libraryRead.test.ts`, `tests/fileCardText.test.ts`
- Требования: `library-transfer` → «Загрузка избранного и недавних» (карточка, «Только избранное», повторная загрузка)
- Design: «Карточка», «Подготовка и записи» (prepareImport)
- Контракты: потребляет K1, K3, K4; вводит K5, K6, K8 (`add.file.listsSummary`)
- Усиление проверок: 3.2 — «повторная загрузка → всё уже в библиотеке» на состоянии, записанном `writeImport`, а не
  собранном руками; 3.3 — `runFileImport` с карточкой, где только `newFavoriteCount = 1`, доходит до записи.

### G4 · Запись импорта · M · волна 4

- Задачи: 4.1, 4.2
- Зависит от: G1, G3
- Файлы: `src/core/libraryFile/importRecords/**`, `src/core/db.ts`, `tests/libraryImport.test.ts`, `tests/writeImport.test.ts`
- Требования: `library-transfer` → «Загрузка избранного и недавних» (объединение, атомарность, без дублей);
  `favorites` → «Избранное не зависит от недавних и паков»
- Design: «Подготовка и записи»
- Контракты: потребляет K1, K4, K6; вводит K7
- Усиление проверок: 4.2 — прерванная транзакция обрывается после `put` избранного и недавних (а не до), и оба хранилища
  те же; лимит недавних проверяется удалением в базе, а не по ответу `buildImportRecords`.

### G5 · Исход импорта, дока и гейт · M · волна 5

- Задачи: 5.1, 6.1, 7.1
- Зависит от: G3, G4
- Файлы: `src/core/ui/Picker/PickerProvider/{fileImportOutcome/**,useFileImport.ts,PickerProvider*.tsx,usePickerState.ts}`,
  `src/core/ui/Picker/GifView/useRecentGifs/**`, `src/core/i18n/messages.{ru,en}.ts`, `tests/fileImportOutcome.test.ts`,
  `docs/content/{,en/}{setup/transfer,privacy}.md`, `CLAUDE.md`
- Требования: `library-transfer` → «Слияние с библиотекой» (статус, переход ленты, фокус); `user-docs` → «Перенос
  библиотеки в доке», «Политика конфиденциальности»
- Design: «Исход»
- Контракты: потребляет K5, K7; вводит K8 (`status.fileImportListsDone`)
- Усиление проверок: 5.1 — тест, что после записи вызваны перечитывание избранного и недавних обоих видов (недавние
  GIF читает `useRecentGifs` в `GifView` — нужен сигнал из провайдера, иначе лента GIF устареет); выбор раздела:
  избранные только GIF → не «Избранное».

### G6 · Приёмка на стенде · S · волна 6

- Задачи: 7.2
- Зависит от: G2, G5
- Файлы: — (только проверка; находки — в журнал)
- Требования: `library-transfer` → сценарии «Перенос избранного и недавних», «Только избранное», «Пустая библиотека»,
  «Только избранные GIF», «Отмена не трогает избранное»
- Design: —
- Контракты: проверяет K1–K8 сквозь продукт
- Усиление проверок: стенд-сценарии 2.2 («Пустая библиотека», «Только избранные GIF») — здесь же.

## Волны

1. G1
2. G2
3. G3 — после G2: общие `db.ts` и словари
4. G4 — `db.ts`
5. G5
6. G6
