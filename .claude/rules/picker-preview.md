---
paths:
  - "/src/core/ui/Picker/Preview/**"
  - "/src/core/ui/Picker/pressGesture/**"
  - "/src/core/ui/Picker/usePressPreview/**"
  - "/src/core/ui/Picker/useCellPreview/**"
  - "/src/core/ui/Picker/cellName/**"
  - "/src/core/ui/Picker/cellIdOf/**"
  - "/src/core/ui/Picker/StickerCell/**"
  - "/src/core/ui/Picker/StickerFeed/useStickerNavigator/**"
  - "/src/core/ui/Picker/StickerFeed/stickerNeighbor/**"
  - "/src/core/ui/Picker/MasonryGrid/useMasonryNavigator/**"
  - "/src/core/ui/Picker/MasonryGrid/masonryNeighbor/**"
  - "/src/core/ui/Picker/StickerFeed/cellId/**"
  - "/src/core/ui/Picker/MasonryGrid/gifCellId/**"
  - "/src/core/ui/Picker/revealScrollTop/**"
---

# Предпросмотр

Крупный показ стикера или GIF поверх страницы: удержание, меню, стрелки, анимации.

Как в Telegram: пелена 40 % без размытия, картинка в квадрате до 400 px (мелкая увеличивается), над стикером — эмодзи
(`PreviewTarget.emoji`). У GIF — версия для отправки, до загрузки — растянутое превью ленты. Слой — во втором хосте
пикера (`picker.md`).

**Один на панель:** ячейки под виртуализацией размонтируются, а оверлей и отпускание должны их пережить. `PreviewPortal/`
рисует слой в корень второго хоста, состояние — пропсами (`PreviewLayer/`): контекст панели туда не доходит. Ячейки берут
стабильный `usePreviewActions()`, состояние `usePreview()` читает только оверлей — шаг не перерисовывает ленту.

**Удержание.** Основная кнопка мыши или пера дольше `HOLD_DELAY_MS` (300 мс): `createPressGesture` → `usePressPreview` →
`useCellPreview`, pointer-хендлеры объявляет ячейка. Отмена — сдвиг больше `HOLD_SLOP_PX` (6 px) или уход с ячейки.
Касание не участвует (`HOLD_POINTER_TYPES`: долгое касание открывает меню браузера, его пункт ведёт сюда же), как и
Ctrl+клик и занятая отправкой ячейка. Слой без курсора и фокуса, скринридеру не объявляется. `pointerenter` с зажатой
кнопкой (`shouldSwapPreview` → `swapHold`) переключает ячейку без задержки, `selectstart` отменяется. Слушатели
`pointerup` / `pointercancel` — на `window`, синхронно в `openHold`, а не эффектом: иначе отпускание в кадре срабатывания
проскочит. Следующий `click` гасится в capture (снятие по `setTimeout(0)`) — ячейка не отправляет.

**Меню.** «Предпросмотр» (`openPinned`) — диалог с фокусом на «Закрыть». Закрывают Escape (попап остаётся), клик где
угодно (до страницы не доходит: `app.ts` пропускает `mousedown` со слоем в `composedPath()`), кнопка, уход фокуса, смена
режима, экран, закрытие попапа. Фокус возвращается на ячейку, если она в ленте, — кроме ухода фокуса.

**Стрелки** — только у закреплённого из ленты: навигатор из `PreviewNavigationContext` (кладут `StickerFeed` /
`MasonryGrid`) уходит через `openPinned` в состояние. Слой гасит прокрутку страницы, `previewDirection/` → `step`,
`null` — край; с модификатором — не шаг (Alt+← — история). Навигатор читает раскладку из ref (выдача GIF подгружается и
при открытом). Сосед — по раскладке, а не по DOM (`stickerNeighbor/`, `masonryNeighbor/`), без заголовков, подсказок,
«Создать стикер» и заглушек. Кнопка — по id (`cellId`, `gifItemCellId(sectionId, gif)`: ключ GIF уникален только в
разделе; тип — `CellIdOf`), лента к ней — `revealScrollTop`, не `scrollIntoView` (прокрутил бы amo); нет в окне — как
край. Цель — тот же `previewTarget/`. Шаг — без вылета, фокус остаётся в диалоге, закрытие возвращает картинку и фокус в
показанную ячейку. Смену имени диалога скринридеры не читают: live region `sr-only` с `key` от `stepCount`. Показанную
ячейку метит `useCurrentCellMark/` атрибутом `data-preview-current` на узел (кольцо — в `picker.css`), не пропом: иначе
лента перерисовывалась бы на каждый шаг.

**Анимации** (`previewMotion/`, скриптом; `flyTransform` — чистая, с тестом). Открытие (`playPreviewOpen`): пелена
175 мс под `motion-safe:`, FLIP картинки от `img` ячейки 280 мс, эмодзи из `scale(0)` с перелётом; у `object-fit:
contain` — от видимой картинки (`containRect`). Раз на открытие, не на смену ячейки при удержании; при
`isMotionReduced()` — без них, и уход снимает слой сразу. Закрытие: `close()` ставит `isLeaving` — предпросмотр уже
закрыт по смыслу; `playPreviewClose` (220 мс к ячейке, нет ячейки — гаснет на месте) → `finishLeave` снимает состояние,
только если оно то же. Уходящий слой `inert`; новое открытие прерывает уход.

Пока открыт — причина удержания попапа `preview` (`PANEL_REASONS`), пишет только провайдер. Имя диалога — фраза словаря
из `cellName/`.
