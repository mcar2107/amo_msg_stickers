---
paths:
  - "/src/core/app.ts"
  - "/src/core/amoDom*.ts"
  - "/src/core/hoverPopup*.ts"
  - "/src/core/iconColor*.ts"
  - "/src/core/pageEscape*.ts"
  - "/src/core/ui/createPicker.tsx"
  - "/src/core/ui/icons.ts"
---

# Встраивание в amo и разметки amo web

Старт на странице, кнопка стикеров, открытие попапа, три разметки amo web.

## Кнопка

`start(host)` (`app.ts`) — один раз на страницу (`window.__amoStickers`). MutationObserver на `body` (пачки через
`requestAnimationFrame`) ставит кнопку сразу после обёртки эмодзи с её классами (`AmoMarkup.button`) — стили amo без
своего CSS. Цвет иконки — **заменой** классов (`idleClasses` / `openClasses`): из двух `fill-*` победит поздний в CSS
amo. В правке — `editClasses` (иконка эмодзи в правке светлеет в тёмной теме), открытый попап важнее
(`iconColorClasses`); цвет пересчитывается на каждом поиске полей: вход в правку и выход меняют узлы строки поля.
Worker-версия — `currentColor` (`iconFill`), правку не отмечает.

## Попап

Один на страницу; когда и у какой кнопки открыть — контроллер без DOM `createHoverPopup` (`hoverPopup.ts`):

- **Наведение** 250 мс — открыть, уход с кнопки и попапа — закрыть через 500 мс; `mouseout` без `relatedTarget` — уход.
- **Клик** закрепляет: уход курсора и наведение на другую кнопку не действуют, переносит только клик. Клик по кнопке
  закреплённого, клик вне (кроме слоя предпросмотра — `app.ts` пропускает `mousedown` с `previewElement` в
  `composedPath()`), Escape и отправка закрывают.
- **Escape вне панели** и предпросмотра закрывает только попап (`isPageEscape`, `keydown` в capture-фазе `window`), иначе
  amo закрыл бы чат. Escape внутри панели — её обработчикам; IME и закрытый попап не перехватываются.
- **Удержание** (`hoverPopupHolds.ts`) не даёт уходу курсора закрыть открытый наведением: поле панели в фокусе, диалог
  файла, `import`, `export`, конвертация, `screen` (форма не должна прятаться), предпросмотр. Спрашивается при
  срабатывании таймера; снятие последней причины при курсоре снаружи закрывает. Закрытие снимает причины DOM панели, а
  импорт, выгрузка, конвертация и экран живут дальше.
- **Уход** — 200 мс анимации (`hoverPopupPhase.ts`) без приёма курсора; возврат к той же кнопке открывает сразу.

## Разметки

DOM amo — только в `amoDom*.ts`; одна сборка работает со всеми тремя:

- **Стабильная** (`amoDomStable.ts`) — контракт новой amo: `data-compose-*` (`-input`, `-row`, `-emoji`, `-send`,
  `-cancel-edit`, `data-visible`), `data-feed-*`, `data-photo-*`.
- **Прежняя** (`amoDomLegacy.ts`) — `aria-placeholder`, `aria-label="Send message"` / `"cancel edit"`, tailwind-классы,
  `opacity-100`.
- **Worker-версия** (`amoDomWorker.ts`) — сообщения отправляет ядро страницы в Web Worker. Поле
  `[contenteditable][role="textbox"]` в капсуле `[data-capsule-top]`, эмодзи — `button[aria-haspopup="dialog"]`;
  «Отправить» есть только при непустом черновике, вложения — `[data-attachments]`, правка — `[data-editing]`. Лента — см.
  `feed-style.md`.

Контракт `AmoMarkup` (`amoDom.types.ts`): `findComposers`, `isEditing` / `isDraftEmpty` / `sendButtonOf`, `button`,
`MessageSelectors`. Черновик читается в момент вызова: в Worker-версии «Отправить» живёт с черновиком, а отмена правки
висит в DOM на анимации ухода. Фасад `amoDom.ts` спрашивает все разметки, поле несёт свою (`Composer.markup`). Чтобы
разметки не пересекались (у новой amo те же классы), прежняя исключает `:not([data-compose-input])` /
`:not([data-feed-message])`, Worker-версия — стабильный маркер и `aria-placeholder`. Когда amo перейдёт на стабильную,
прежняя удаляется одним файлом.

## Где встаёт панель

Хост пикера — внутри кнопки (shadow root — `picker.md`), `fixed` считается от предка с transform. `ButtonMarkup.anchor`
(`open(openedBy, anchor)`): стабильная и прежняя — `composer`, Worker-версия — `button`, 9 px над ней; transform
(`translateZ(0)`) там на обёртке кнопки — на полосе поля уехала бы `fixed`-панель форматирования. Высота — `panelHeight`
на каждом открытии: до низа шапки чата, не больше 400 px, — иначе в низком окне ушла бы под шапку.

## Тема

`resolveDarkTheme` (`amoDom.ts`, чистая): класс `dark` на `<html>`, затем `data-amo-theme="dark"` / `"light"`
(Worker-версия), без обоих — системная тёмная, но только при поле Worker-версии на странице: у прежней amo в светлой
теме нет ни класса, ни атрибута, и системная перекрасила бы пикер. `app.ts` пересчитывает её по `class` и
`data-amo-theme` на `<html>`, `watchSystemTheme`, вставке кнопки и перед каждым открытием и зовёт `setTheme` фасада
(`picker.md`).
