# Журнал прогона

Решения без заказчика, отступления от спеки, итоги аудитов и долг прогона change `pack-file-transfer`.

## 2026-10-15

### Живые образцы

Отдельных образцов у пользователя не запрашивали (правило: вопросы по контенту — в конце, не блокировать прогон).
Источники: пак Telegram — импорт на стенде по токену из `.env`; видео-пак — `local/samples/video_gachi/` (45 webm + set.json);
свои стикеры — синтетика на стенде; живой amo — `web.dev.amo.tm`, учётки в `local/dev-amo-creds.md` (в отчёты не выводить),
заготовки запуска — `local/live103/`. Нагрузка 6.2 — синтетическая библиотека, сгенерированная на стенде.

### G1 · Скачивание и словари

`downloadBlob` (K2): ссылка не вставляется в DOM (не будить MutationObserver), отзыв URL через 60 с. Словари: 45 ключей ru/en (K1), «Импорт отменён» — переиспользован `status.importCanceled`.
Проверено (каталог загрузок CDP `Browser.setDownloadBehavior`, `downloadProgress: completed`): стенд — мир страницы `page-world Котики.amostickers` 3 145 728 B, content script `content-script Мои стикеры.amostickers` 3 145 728 B, без жеста `no-gesture.amostickers` 4 B; web.dev.amo.tm (страница входа) — то же в обоих мирах, blob URL с origin страницы. Запасной путь через агента не нужен.
Отступление: userscript с менеджером (Tampermonkey) не проверен агентом — менеджер не ставится в headless; вопрос пользователю, проверка — G9 (6.3).
Аудит: 2 круга (1-й critical — нет записи по окружениям и Tampermonkey, исправлено в design.md), итог ok.
Долг: `add.file.import/cancel/chooseFile/replaceFile` дублируют ключи других сегментов — проверить использование в G8; `add.file.writing` и `status.fileImportWriting` — проверить использование в G7/G8; «4 ГБ» в словаре vs «4 ГиБ» в спеке — сверить в доке (G10); design.md:246 строка длиннее 120; сквозная выгрузка из меню пака в открытом чате — G9.
Вопрос пользователю: Tampermonkey — проверка пользователем или G9 обязательна до мержа, либо принимается довод «isolated world того же вида, что content script».

### G2 · Zip

K3: `writeZip(entries, {modified})`, `readZipDirectory(blob, {maxEntries})`, `findZipRoot(dir, fileName)` → '' | '<папка>/' | null, `readZipEntry(blob, entry, {maxBytes, type})`; `ZipError.kind` 'broken' | 'tooLarge', без `t()`.
Решения: имя записи декодируется как UTF-8 и без флага бита 11 (zip -r и ditto в macOS пишут UTF-8 без флага), при ошибке — latin1; запись больше `maxBytes` → 'broken'; `findZipRoot` смотрит на папки верхнего уровня кроме `__MACOSX`; имя длиннее 65 535 байт и архив ≥ 4 ГиБ при записи → 'tooLarge' до чтения данных. Фикстуры `zip -r`/`ditto` — base64 в tests/helpers/zipFixtures.ts.
Проверено: свой архив проходит `unzip -t`, python zipfile, `ditto -x -k`; пересжатый `zip -r`/`ditto -c -k --keepParent` читается побайтно.
Аудит: 2 круга (1-й critical — тест перекрытия записей без зубов: отклоняла сверка CRC; исправлено пересчётом CRC), итог ok.
Долг: чтение файла ≥ 4 ГиБ даёт 'broken' — G3 обязана проверить `file.size` до `readZipDirectory` («слишком большой файл»); `/usr/bin/unzip` 6.0 macOS не распаковывает не-ASCII имя с флагом 11 — имена формата держать ASCII.

### G3 · Манифест и чтение файла

K4/K5: `parseManifest(unknown)` → {manifest} | {error: notOurs|tooNew|invalid|tooBig|empty}, `clampGraphemes` в limits.ts; `readLibraryFile(Blob)` → LibraryFile; `compareWithLibrary`/`loadFileCard` → FileCard; `prepareImport(file, card, {signal, onProgress})` → ImportPlan; `toFileError` экспортирован для G5/G7.
Решения: размер ≥ 2^32 → tooBig до `readZipDirectory` (долг G2 закрыт); битый каталог с сигнатурой zip в начале → «битый», иначе «не наш»; manifest не JSON / без `format` → notOurs, > 16 МБ → invalid; неверный тип необязательного поля → invalid, `sourceRef` у custom отбрасывается; `isNew` — только не-custom пак вне библиотеки с новыми стикерами; префикс `tg:` — локальная константа (импорт `TG_ID_PREFIX` тянул бы convert/gif-worker).
Аудит: 1 круг, ok.
Долг: повтор пака проверяется после отбрасывания пустых — дубль с пустым `stickers` принимается (manifest.types.ts:333); предел GIF 8 МБ (readLibraryFile.ts:211) без теста; сверка через `listAllStickers()` вместо ключей (`getAllKeys`, design 4.2) — G4 может дать хелпер, учесть на нагрузке G9.
