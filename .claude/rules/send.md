---
paths:
  - "/src/core/sender.ts"
  - "/src/core/pageClient*.ts"
  - "/src/core/app.ts"
  - "/src/page/**"
  - "/src/shared/pageBridge*.ts"
  - "/src/shared/workerCompose.ts"
---

# Отправка стикера

Пути отправки, агент в мире страницы и его протокол с ядром.

```
blob → File(image/gif, имя из sendFileName) → sendFile → стороны из заголовка GIF
  ├─ Worker-версия: агент → ядро страницы postMessage({ kind: 'sendFiles' }) → accepted
  ├─ очередь amo: агент → sendRequest({ type: 'sendNewMessages' }) → accepted
  └─ запасной путь: paste в contenteditable → «Отправить» разметки → click
```

## Агент и очередь amo

Основной путь не трогает поле ввода: стикер — отдельное сообщение очередью amo (как опрос) или командой ядра
Worker-версии. Их видят только скрипты страницы, поэтому шлёт агент (`src/page/`; чужие объекты читает `field.ts` без
доверия к форме). Ядро метит поле и скрытый `<input type="file">` атрибутом с `id` команды и шлёт `CustomEvent`
(`shared/pageBridge.ts`, клиент `core/pageClient.ts`, пометки снимает по ответу); `<input>` — в `documentElement`, не в
`body`, чтобы не будить `MutationObserver` ядра и amo.

Агент: `{ reduxStore, sendRequest }` по fiber поля (`findClient.ts`) → сообщение как у опроса (`buildMessage.ts`: чат из
`state.location` / `state.dialogs`, `localFlag: PREPARING`; `media.id` = `localPhotoSize.localFileId`, иначе amo не
найдёт файл при загрузке и повторе) → синхронный ответ `accepted` / `rejected` с причиной. Прочитать `File` агент не
успевает: стороны — `PageRequest.dims` из `gifScreenSize`, не прочитались — запасной путь (`no-dims`).

## Worker-версия

Ссылку на module Worker ядра страница не отдаёт: агент, стартовав раньше неё (`environments.md`), подменяет
`window.Worker` прозрачным подклассом (`workerCore.ts`, `catchCore`). Ядро — экземпляр, чьё первое сообщение — доклад
протокола (запись `call` с направлением и именем или известный доклад); иное, `error`, `terminate` — забыть (Worker-ы
фото). Имя Worker-а не контракт. Не поймано — `no-core`.

Пропсы поля (`chat`, `edit`, `attached`, `onFilesPick`) — `propsUp` (`fiber.ts`): `__reactFiber$` бывает устаревшей
копией, берётся из `fiber` / `alternate` та, чьи `memoizedProps` равны `__reactProps$`. Нет пропсов — `findClient`,
есть — `coreSend.ts`:

- правка или вложения (`edit`, `attached`, `[data-attachments]` — полоса раньше пропсов) — `draft-busy`: ядро снимает
  черновик чата целиком. Он и `no-core` — на запасной путь, где ошибку покажет защита черновика;
- `sendFiles`: один файл `kind: 'photo'`, `mime: 'image/gif'`, `seq` из `[10⁹, 2³²)` — страница считает с единицы,
  доклады отбираются по своему `seq`; цитату ядро берёт из черновика само;
- текст поля — обратно в черновик событием `input` с `inputType: 'insertText'` (без него страница бросает): своя
  команда черновика потеряла бы жирный, ссылки, упоминания;
- доклад `sent`: отказ (`refused` / нет `key`) — `console.warn`; принят, тот же чат, `down.shown` — `down.onClick()`
  кнопки ленты (страница ведёт ленту к низу только по своему `seq`): свой `scrollTop` сбил бы якорь виртуальной ленты.

## Ответ с цитатой (очередь amo)

`refersTo` — объект из `state.messages` по `state.conversationDraughts[<id>].refersTo`, пересланное развёрнутым
(`refersTo.ts`). После постановки — снятие запросом «×» (`updateConversationDraughtRefersToId`), ответ `accepted` при
любом исходе. Снимаемый ответ помнится до конца запроса, не дольше 10 с: второй стикер в окне — без цитаты, зависший
запрос не держит ответ до перезагрузки. Нет сообщения в `state.messages` — без цитаты и без снятия. Протокол об ответе
не знает.

## Выбор пути и запасной путь

`sendFile` (`sender.ts`): `rejected` или нет ответа к возврату `dispatchEvent` — `console.info` и сразу запасной путь.
После `accepted` запасного пути нет: один клик — одно сообщение. «Отправлено» = «amo принял» (`accepted` или клик
«Отправить»; неудачу загрузки amo покажет с «Повторить»), после этого `app.ts` пишет недавние.

Запасной путь: в `DataTransfer` — **только** файл (с `text/plain` вставится текст). Вложение ждём до 15 с по
`sendButtonOf`, а не по черновику: в Worker-версии полоса вложений раньше кнопки. Кнопка ищется заново при нажатии,
пропала — `SendError`. Текст, вложения или правка в поле — `SendError`, иначе стикер уйдёт с черновиком.

## Что готовит `app.ts`

- Имя — `sendFileName`, в `toGifFile` / `toCheckedGifFile` готовым: дефолта у `sender.ts` нет.
- `toFile`: запись стикера (`getSticker`), иначе снимок избранного (`getFavoriteSticker`, та же метка), иначе
  `SendError`; `SendItem` об удалении не знает.
- GIF из поиска и недавних > 2 МБ (`MAX_GIF_BYTES`) по весу **скачанного** (выдача бывает без весов, недавняя — со
  ссылкой на тяжёлую) — `toCheckedGifFile` до конвертации (страница ошибки — «Файл не похож на GIF», а не ошибка
  декодера), затем `toStickerGif(file, 'image')` (`convert.md`); последняя сторона уходит как есть.
