## 1. Тесты на species-вызов

- [x] 1.1 Помощник в `tests/helpers/` (реэкспорт в `tests/helpers/index.ts`): на время асинхронного вызова ставит бросающий геттер на `Uint8Array.prototype.constructor` и восстанавливает дескриптор в `finally`; проверка — тест помощника или его использование в 1.3 падает на `subarray` и проходит после восстановления
- [x] 1.2 `tests/gif.test.ts`: `inspectGif` и `gifScreenSize` над массивом с собственным бросающим геттером `constructor` разбирают GIF так же, как обычный; проверка — тест падает на текущем `hasGifSignature` с `subarray`
- [x] 1.3 `tests/zipRead.test.ts`: `readZipDirectory` и `readZipEntry` stored-архива под помощником из 1.1 возвращают те же имена и байты; проверка — тест падает на текущем `central.subarray`

## 2. Чтение байтов без species-методов

- [x] 2.1 `src/core/gif.ts`: `hasGifSignature` читает шесть байтов сигнатуры индексами, без `subarray` / `slice`; проверка — 1.2 и весь `tests/gif.test.ts` зелёные
- [x] 2.2 `src/core/zip/zipRead.ts`: имя записи центрального каталога — представление `new Uint8Array(buffer, byteOffset + start, length)` над тем же буфером, без `subarray`; проверка — 1.3, `tests/zipRead.test.ts`, `tests/libraryRead.test.ts`, `tests/libraryImport.test.ts` зелёные
- [x] 2.3 `.claude/rules/external-data.md`: правило — над байтами из `Blob.arrayBuffer()` в коде изолированного мира userscript-а не звать `subarray` / `slice` (и другие species-методы), с причиной (Firefox, `Permission denied to access property "constructor"`) и допустимой заменой; проверка — `ast-grep run -p '$X.subarray($$$)' -l ts src/core src/shared src/userscript` находит только `net.ts` (чанк потока) и `gifEncoder.ts` (Worker)

## 3. Проверка

- [x] 3.1 `pnpm lint` и `pnpm test` зелёные
- [ ] 3.2 Живой Firefox + Tampermonkey на стенде (`pnpm harness`, userscript из `pnpm build` установлен в Tampermonkey; Firefox и установку запускает пользователь, управление по BiDi): свой стикер и GIF из выдачи KLIPY отправляются без `Permission denied`, файл `.amostickers` загружается и показывает карточку
