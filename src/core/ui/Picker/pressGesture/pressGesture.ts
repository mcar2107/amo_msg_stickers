import { NO_TIMER, scheduleTimeout } from '@core/hoverPopup';

import type {
  PressGesture,
  PressGestureOptions,
  PressOrigin,
  PressStart,
} from './pressGesture.types';

/**
 * Сколько держать кнопку до предпросмотра, мс. Короче — обычный клик.
 */
export const HOLD_DELAY_MS = 300;

/**
 * Насколько указатель может сместиться от точки нажатия, px: дрожание руки удержание
 * не отменяет, сдвиг дальше — да.
 */
export const HOLD_SLOP_PX = 6;

/**
 * Виды указателя, которые удерживают: у касания длинное нажатие открывает контекстное меню
 * браузера, а его пункт ведёт в тот же предпросмотр.
 */
const HOLD_POINTER_TYPES = new Set(['mouse', 'pen']);

/**
 * Основная кнопка: `PointerEvent.button === 0`.
 */
const PRIMARY_BUTTON = 0;

/**
 * Маска основной кнопки в `PointerEvent.buttons`: бит `1`.
 */
const PRIMARY_BUTTONS_MASK = 1;

/**
 * Переключает ли вход указателя на ячейку открытый удержанием предпросмотр: мышь или перо
 * с зажатой основной кнопкой. Касание не удерживает, а без зажатой кнопки наведение
 * предпросмотр не меняет.
 *
 * @param pointerType — вид указателя
 * @param buttons — маска зажатых кнопок (`PointerEvent.buttons`)
 * @returns `true` — показать ячейку, на которую вошёл указатель
 */
export const shouldSwapPreview = (pointerType: string, buttons: number) => {
  return HOLD_POINTER_TYPES.has(pointerType) && (buttons & PRIMARY_BUTTONS_MASK) !== 0;
};

/**
 * Жест удержания без DOM. Точка нажатия и таймер живут в замыкании; таймер снимают отпускание,
 * сдвиг, уход и `dispose`, поэтому размонтированная ячейка предпросмотр не откроет.
 *
 * @param options — колбэк удержания и планировщик таймеров
 * @returns обработчики событий указателя и снятие таймера
 */
export const createPressGesture = (options: PressGestureOptions): PressGesture => {
  const { onHold, schedule = scheduleTimeout } = options;
  let origin: PressOrigin | null = null;
  let cancelTimer = NO_TIMER;

  const cancel = () => {
    cancelTimer();
    cancelTimer = NO_TIMER;
    origin = null;
  };

  const start = ({ button, pointerType, isCtrlPressed, x, y }: PressStart) => {
    cancel();

    if (
      button !== PRIMARY_BUTTON ||
      isCtrlPressed ||
      !HOLD_POINTER_TYPES.has(pointerType)
    ) {
      return;
    }

    origin = { x, y };
    cancelTimer = schedule(() => {
      cancel();
      onHold();
    }, HOLD_DELAY_MS);
  };

  const move = (x: number, y: number) => {
    if (!origin) return;

    if (Math.hypot(x - origin.x, y - origin.y) > HOLD_SLOP_PX) {
      cancel();
    }
  };

  return { start, move, cancel, dispose: cancel };
};
