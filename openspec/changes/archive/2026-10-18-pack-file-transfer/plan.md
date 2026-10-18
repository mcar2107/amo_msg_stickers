# План прогона: pack-file-transfer

База прогона: `11d60391f357428ff3083f459ad177e5d988fb3f`
Гейт: `pnpm lint && pnpm test && pnpm build` (G10 — ещё `pnpm docs:build`); pre-commit гоняет typecheck и тесты
Быстрые проверки: `pnpm typecheck`, `pnpm exec vitest run --project=unit tests/<файл>.test.ts`
Долгие слои: `pnpm build` + `pnpm harness` в headless Chrome, расширение — CDP (`local/live103/`) — G1, G6, G8, G9

## Контракты

- **K1 Словарь** — все ключи `add.segment.file`, `add.file.*`, `pack.export`, `status.export*`, `status.fileImport*`,
  `error.libraryFile.*` (с пределами выгрузки и сбоем записи) — G1; дописать позже — только группа, одна в волне.
- **K2** `downloadBlob(blob, name): void` в `src/core/download.ts`. Владелец G1; потребитель G6.
- **K3 Zip** — `zip/` без `t()` и знания формата: пределы — параметрами, ошибка с видом «битый» / «слишком большой»;
  перевод в `error.libraryFile.*` — в `libraryFile/`. Владелец G2; потребители G3, G5.
- **K4** Пределы — только `libraryFile/limits.ts`; гард манифеста `manifest.types.ts` один для чтения и проверки
  выгрузки. Владелец G3; потребитель G5.
- **K5 План импорта** — тип из `prepareImport` (паки в порядке файла, `Blob image/gif`, стороны из `gifScreenSize`) —
  вход `writeImport` (`db.ts`, G4), ответ — реально записанные паки и число стикеров. Владелец G3; потребители G4, G7.
- **K6** `exportFileName.ts`: имя пака по `packTitle`, `amo-stickers-<YYYY-MM-DD>.amostickers`. Владелец G5; потр. G6.
- **K7** `'export'` в `HoldReason` вне `PANEL_REASONS`; импорт файла — та же `'import'`. Владелец G6; потр. G7, G8.
- **K8 Провайдер** — выгрузка: `isExporting`, пак / библиотека (G6); импорт файла: файл, карточка, ошибка, этап
  `checking`/`writing`, ход, старт/отмена, общий «идёт импорт» с Telegram (G7). Потребитель G8.
- **K9** `AddSegment` = `'telegram' | 'custom' | 'file'`, `importErrorTarget(…, segment)`. Владелец G7 (у `file` —
  пустая панель ради зелёных типов); потребитель G8.
- **K10** `headerAction(sectionId, hasStickers)`, у `custom` — меню из «Выгрузить пак». Владелец G6.

## Группы

### G1 · Скачивание и словари · S · волна 1

- Задачи: 1.1, 5.1
- Зависит от: —
- Файлы: `src/core/download.ts`, `src/core/i18n/messages.{ru,en}.ts` (временная кнопка стенда не коммитится)
- Требования: `library-transfer` → «Выгрузка пака»; строки всех требований change · Design: 2, 8, «Риски» · K1, K2
- Усиление проверок: 1.1 — файл в каталоге загрузок (CDP `Browser.setDownloadBehavior`), а не «нет ошибки»

### G2 · Zip · M · волна 1

- Задачи: 2.1, 2.2
- Зависит от: —
- Файлы: `src/core/zip/**`, `tests/zipWrite.test.ts`, `tests/zipRead.test.ts`, `tests/helpers/zip*`
- Требования: `library-transfer` → «Формат файла», «Проверка файла» · Design: 1, 3 · вводит K3
- Усиление проверок: 2.1 — CRC `"123456789"` → `0xCBF43926`, поля заголовков против рукописных чисел, не только
  своим `zipRead`; 2.2 — base64-фикстуры настоящих `zip -r` и `ditto -c -k --keepParent` (data descriptor, `__MACOSX/`)

### G3 · Манифест и чтение файла · M · волна 2

- Задачи: 3.1, 3.2
- Зависит от: G1, G2
- Файлы: `src/core/libraryFile/{limits,manifest.types,readLibraryFile,prepareImport}*`, `tests/libraryManifest.test.ts`,
  `tests/libraryRead*.test.ts`
- Требования: `library-transfer` → «Формат файла», «Проверка файла», «Сегмент «Файл»» · Design: 1, 3, 4 · K4, K5
- Усиление проверок: 3.2 «битый GIF» — байт внутри LZW уже собранного архива: без сверки CRC тест обязан упасть

### G4 · Запись импорта · M · волна 3

- Задачи: 4.1
- Зависит от: G3
- Файлы: `src/core/db.ts`, `src/core/db.types.ts`, `src/core/libraryFile/importRecords*`, `tests/libraryImport.test.ts`
- Требования: `library-transfer` → «Слияние с библиотекой»; `sticker-library` → «Порядок паков по использованию»
- Design: 4 · K5
- Усиление проверок: 4.1 — записи строит только чистая функция из теста; в колбэках транзакции ни `await`, ни
  промисов не-IDB — аудит чтением; `onabort` — в G9

### G5 · Выгрузка · M · волна 3

- Задачи: 4.2
- Зависит от: G2, G3
- Файлы: `src/core/libraryFile/{exportLibrary,exportFileName}*`, `tests/libraryExport.test.ts`
- Требования: `library-transfer` → «Выгрузка пака», «Выгрузка библиотеки», «Состав файла» · Design: 1, 5 · K6
- Усиление проверок: 4.2 — круговой тест идёт через тот же гард; добавить сверку `manifest.json` с рукописным объектом

### G6 · Выгрузка в пикере · M · волна 4

- Задачи: 5.2, 5.3
- Зависит от: G1, G5
- Файлы: `src/core/hoverPopup*`, `PickerProvider/**`, `SectionHeader/**`, `StickerFeed/**`, `tests/hoverPopup.test.ts`,
  `tests/headerAction.test.ts`
- Требования: `library-transfer` → «Выгрузка пака», «Одна выгрузка за раз»; `sticker-library` → «Ссылка на пак»;
  `composer-integration` → «Открытие попапа наведением и кликом» · Design: 2, 6 · K7, K8, K10
- Усиление проверок: 5.3 — скачанный со стенда файл пака — `unzip -l` и `manifest.json` против состава пака

### G7 · Состояние импорта файла · M · волна 5

- Задачи: 5.4, 5.5
- Зависит от: G3, G4, G6
- Файлы: `usePickerView/**`, `AddView/{AddView.tsx,segmentIds/**}`, `Screen/useScreenFocus/**`, `PickerProvider/**`,
  `useTelegramImport/**`, `tests/{addSegment,finishImport,fileImportOutcome}.test.ts`
- Требования: `composer-integration` → «Навигация попапа»; `picker-states` → «Каркас экрана»; `library-transfer` →
  «Прогресс и отмена…», «Один импорт за раз», «Слияние…»; `telegram-import` → «Форма импорта» · Design: 4, 6, 7 · K8, K9
- Усиление проверок: 5.5 — переход к первому по порядку ленты разделу с добавленными, а не первому в файле

### G8 · Сегмент «Файл» · M · волна 6

- Задачи: 5.6
- Зависит от: G6, G7
- Файлы: `AddView/**` (`FileTransfer/**`, `TelegramImport/TelegramImportFooter/**`, `AddView.tsx`)
- Требования: `library-transfer` → «Сегмент «Файл»», «Выгрузка библиотеки», «Прогресс и отмена…»; `picker-states` →
  «Каркас экрана» · Design: 7 · K7, K8, K9

### G9 · Приёмка на стенде и в живом amo · M · волна 7

- Задачи: 6.1, 6.2, 6.3
- Зависит от: G8
- Файлы: правки по находкам в файлах G1–G8; замеры — в `journal.md`
- Требования: все сценарии `library-transfer` · K2, K5, K7 в продукте
- Усиление проверок: 6.1 — «библиотека не изменилась» — дамп IndexedDB (id записей) до и после; квота — CDP
  `Storage.overrideQuotaForOrigin`

### G10 · Дока и итог · S · волна 8

- Задачи: 7.1, 7.2, 7.3
- Зависит от: G9
- Файлы: `docs/content/**`, `docs/.vitepress/config.mts`, `CLAUDE.md`
- Требования: `user-docs` → все четыре

## Волны

1. G1, G2 — файлы не пересекаются
2. G3
3. G4, G5 — `db.ts` только у G4, словари не трогают
4. G6
5. G7 — провайдер после G6
6. G8 — `AddView.tsx` после G7
7. G9
8. G10
