## Context

Мотивация — proposal.md, «Why»; механизм разобран в комментарии к issue #138 (проба в Firefox 157.0.1, Tampermonkey
5.5.0, шапка userscript-а `@sandbox DOM`, `@inject-into content`).

Наблюдения пробы над `u = new Uint8Array(await blob.arrayBuffer())` в изолированном мире:

- индексы, `length`, `byteLength`, `buffer`, `new DataView(buf)`, `new Uint8Array(buf, offset, length)`, итерация,
  `TextDecoder.decode(u)` — работают;
- `u.subarray(...)`, `u.slice(...)` — бросают: оба ищут species-конструктор через `u.constructor`;
- буфер от `fetch().arrayBuffer()`, чанки `ReadableStream`, свой `new ArrayBuffer` — не затронуты.

Species-вызовы над байтами из `Blob` в коде, который работает в изолированном мире userscript-а (`src/core`,
`src/shared`, `src/userscript`; `src/page` — мир страницы, `gifEncoder` / `gifWorker` — Worker,
`src/extension/background.ts` — service worker):

| Место | Байты | Путь |
|---|---|---|
| `gif.ts`, `hasGifSignature` — `bytes.subarray(0, 6)` | `file.slice(0, 13).arrayBuffer()` (`sender.ts`, `dimsOf`), `blob.arrayBuffer()` (`sender.ts`, `toCheckedGifFile`) | отправка любого стикера и GIF |
| `zipRead.ts` — `central.subarray(...)` для имени записи | `blob.slice(...).arrayBuffer()` (`readBytes`) | загрузка `.amostickers` |

`net.ts` (`value.subarray` над чанком потока) по пробе не затронут. Остальные `.slice` в ядре — над строками и
обычными массивами.

## Goals / Non-Goals

**Goals:**

- Ни одного species-метода типизированного массива над байтами из `Blob` в коде изолированного мира.
- Тест, который падает на возврате `subarray` / `slice` в эти места, без Firefox.

**Non-Goals:**

- Перевод байтов в «свой» компартмент на границе (`Host`, адаптеры userscript) — см. «Decisions».
- `instanceof` над объектами чужого мира (`tgs.ts`, `error instanceof TypeError` над ошибкой распаковки) — проба их
  не задела; отдельной задачей, если всплывут.
- Поиск причины «раньше работало» (Firefox 156 → 157 или Tampermonkey) — на исправление не влияет.

## Decisions

**Читать байты без species-методов в месте чтения, а не копировать на входе.** Сигнатура GIF — шесть байтов индексами
(`String.fromCharCode(bytes[0], …)` через цикл или проверку побайтно); имя записи zip — `new Uint8Array(central.buffer,
central.byteOffset + start, length)`: представление над тем же буфером, без копии.

Альтернатива — копия `new Uint8Array(u)` сразу после `arrayBuffer()` (`readBytes`, `sender.ts`). Отвергнута: GIF до 2
МБ копируется на каждую отправку, а запрет species-вызова остаётся неявным — следующий `subarray` над байтами из
другого места снова упадёт только в Firefox. Правило «без `subarray` / `slice` над байтами из `Blob`» записывается в
`.claude/rules/external-data.md`, тест его держит.

**Тест — отравленный `constructor`.** Для `gif.ts`: экземпляр `Uint8Array` с собственным геттером `constructor`,
который бросает, — ровно то, что видит код в Firefox. Для `zipRead.ts` байты создаёт сам код из `Blob`, экземпляр
подменить нельзя: на время чтения архива геттер ставится на `Uint8Array.prototype.constructor` (помощник
`tests/helpers/`, восстановление в `finally`). Проба в Node: `Blob.slice().arrayBuffer()` и `TextDecoder` с таким
геттером работают, `subarray` бросает.

## Risks / Trade-offs

- [Отравленный прототип задевает код Node или vitest во время `await`] → геттер ставится только вокруг вызова
  `readZipDirectory` и `readZipEntry` и снимается в `finally`; если окружение тестов на нём падает — тест на zip
  ограничивается синхронным разбором каталога из готового буфера.
- [Новый species-вызов в другом месте ядра] → правило в `external-data.md`; тест ловит только покрытые места.
- [Юнит-тест не доказывает работу в Firefox] → прогон в живом Firefox + Tampermonkey на стенде: отправка своего
  стикера и GIF из выдачи, загрузка `.amostickers`.
