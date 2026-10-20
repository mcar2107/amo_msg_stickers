## Why

В Firefox + Tampermonkey (issue #138) любой стикер — свой, из пака Telegram, GIF из выдачи — не отправляется: пикер
показывает `Error: Permission denied to access property "constructor"`. В изолированном мире userscript-а Firefox
отдаёт байты `Blob.arrayBuffer()` объектами мира страницы, и species-методы типизированного массива (`subarray`,
`slice`), которые читают `constructor` массива, упираются в запрет доступа через границу миров. Отправка в Firefox
через userscript сейчас не работает совсем.

## What Changes

- Проверка сигнатуры GIF (`hasGifSignature` в `src/core/gif.ts`) читает первые байты индексами, без `subarray`: её
  проходят оба пути отправки — свой стикер или стикер из Telegram (стороны по заголовку) и GIF из выдачи (проверка
  файла целиком).
- Разбор центрального каталога zip (`src/core/zip/zipRead.ts`) берёт байты имени записи представлением над тем же
  буфером (`new Uint8Array(buffer, offset, length)`), без `subarray`: тот же механизм ломал бы загрузку файла
  `.amostickers` в Firefox + Tampermonkey.
- Юнит-тесты, которые ловят species-вызов: разбор GIF над массивом с бросающим `constructor` и чтение zip при
  бросающем `Uint8Array.prototype.constructor`.
- Поведение в Chrome (расширение и userscript) не меняется: те же байты, тот же результат.

## Capabilities

### New Capabilities

### Modified Capabilities
- `runtime-hosts`: требование «Userscript» — отправка стикеров и GIF и загрузка файла выгрузки в изолированном мире
  userscript-а работают и там, где байты файла приходят объектами мира страницы (Firefox).

## Impact

- Код: `src/core/gif.ts`, `src/core/zip/zipRead.ts`; тесты — `tests/gif.test.ts`, `tests/zipRead.test.ts`, помощник
  в `tests/helpers/`.
- Сеть, хранение, формат файла выгрузки, API — без изменений.
- Проверка в живом Firefox + Tampermonkey на стенде — запускает пользователь (Firefox и установка в Tampermonkey —
  руками), управление по BiDi.
