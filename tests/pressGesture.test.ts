import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PressStart } from '@ui/pressGesture';
import {
  createPressGesture,
  HOLD_DELAY_MS,
  HOLD_SLOP_PX,
  shouldSwapPreview,
} from '@ui/pressGesture';

/**
 * Основная кнопка мыши в точке (100, 100).
 */
const MOUSE_PRESS: PressStart = {
  button: 0,
  pointerType: 'mouse',
  isCtrlPressed: false,
  x: 100,
  y: 100,
};

/**
 * Жест с записью числа удержаний.
 *
 * @returns жест и счётчик `onHold`
 */
const setup = () => {
  let holds = 0;
  const gesture = createPressGesture({
    onHold: () => {
      holds += 1;
    },
  });

  return {
    gesture,
    holds: () => {
      return holds;
    },
  };
};

describe('createPressGesture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('константы спеки: 300 мс и 6 px', () => {
    expect(HOLD_DELAY_MS).toBe(300);
    expect(HOLD_SLOP_PX).toBe(6);
  });

  it('срабатывает на 300 мс и не раньше', () => {
    const { gesture, holds } = setup();

    gesture.start(MOUSE_PRESS);
    vi.advanceTimersByTime(HOLD_DELAY_MS - 1);
    expect(holds()).toBe(0);

    vi.advanceTimersByTime(1);
    expect(holds()).toBe(1);
  });

  it('срабатывает один раз, повторного удержания без нового нажатия нет', () => {
    const { gesture, holds } = setup();

    gesture.start(MOUSE_PRESS);
    vi.advanceTimersByTime(HOLD_DELAY_MS * 3);

    expect(holds()).toBe(1);
  });

  it('перо удерживает так же, как мышь', () => {
    const { gesture, holds } = setup();

    gesture.start({ ...MOUSE_PRESS, pointerType: 'pen' });
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(1);
  });

  it('отпускание или уход с ячейки до срока отменяют удержание', () => {
    const { gesture, holds } = setup();

    gesture.start(MOUSE_PRESS);
    vi.advanceTimersByTime(HOLD_DELAY_MS - 100);
    gesture.cancel();
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(0);
  });

  it('сдвиг на 10 px за 200 мс отменяет удержание', () => {
    const { gesture, holds } = setup();

    gesture.start(MOUSE_PRESS);
    vi.advanceTimersByTime(200);
    gesture.move(110, 100);
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(0);
  });

  it('сдвиг по диагонали считается расстоянием, а не по осям', () => {
    const { gesture, holds } = setup();

    gesture.start(MOUSE_PRESS);
    gesture.move(105, 105);
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(0);
  });

  it('дрожание в пределах 6 px удержание не отменяет', () => {
    const { gesture, holds } = setup();

    gesture.start(MOUSE_PRESS);
    gesture.move(104, 104);
    gesture.move(94, 100);
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(1);
  });

  it('правая и средняя кнопки не запускают удержание', () => {
    const { gesture, holds } = setup();

    gesture.start({ ...MOUSE_PRESS, button: 2 });
    vi.advanceTimersByTime(HOLD_DELAY_MS);
    gesture.start({ ...MOUSE_PRESS, button: 1 });
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(0);
  });

  it('Ctrl+нажатие (правый клик на macOS) не запускает удержание', () => {
    const { gesture, holds } = setup();

    gesture.start({ ...MOUSE_PRESS, isCtrlPressed: true });
    vi.advanceTimersByTime(HOLD_DELAY_MS * 2);

    expect(holds()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('обычное нажатие после Ctrl+нажатия удерживает', () => {
    const { gesture, holds } = setup();

    gesture.start({ ...MOUSE_PRESS, isCtrlPressed: true });
    gesture.start(MOUSE_PRESS);
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(1);
  });

  it('касание не запускает удержание', () => {
    const { gesture, holds } = setup();

    gesture.start({ ...MOUSE_PRESS, pointerType: 'touch' });
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(0);
  });

  it('игнорируемое нажатие снимает начатое перед ним', () => {
    const { gesture, holds } = setup();

    gesture.start(MOUSE_PRESS);
    gesture.start({ ...MOUSE_PRESS, button: 2 });
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(0);
  });

  it('новое нажатие отсчитывает срок заново и считает сдвиг от новой точки', () => {
    const { gesture, holds } = setup();

    gesture.start(MOUSE_PRESS);
    vi.advanceTimersByTime(200);
    gesture.start({ ...MOUSE_PRESS, x: 300, y: 300 });
    gesture.move(302, 300);
    vi.advanceTimersByTime(HOLD_DELAY_MS - 1);
    expect(holds()).toBe(0);

    vi.advanceTimersByTime(1);
    expect(holds()).toBe(1);
  });

  it('движение без нажатия ничего не делает', () => {
    const { gesture, holds } = setup();

    gesture.move(500, 500);
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(holds()).toBe(0);
  });

  it('dispose снимает таймер', () => {
    const { gesture, holds } = setup();

    gesture.start(MOUSE_PRESS);
    gesture.dispose();

    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(HOLD_DELAY_MS);
    expect(holds()).toBe(0);
  });

  it('после удержания таймеров не остаётся', () => {
    const { gesture } = setup();

    gesture.start(MOUSE_PRESS);
    vi.advanceTimersByTime(HOLD_DELAY_MS);

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('shouldSwapPreview', () => {
  it.each([
    ['mouse', 1],
    ['pen', 1],
    ['mouse', 3],
    ['mouse', 5],
  ])(
    '%s с зажатой основной кнопкой (buttons=%i) переключает предпросмотр',
    (type, buttons) => {
      expect(shouldSwapPreview(type, buttons)).toBe(true);
    }
  );

  it.each([
    ['mouse', 0],
    ['mouse', 2],
    ['mouse', 4],
    ['touch', 1],
    ['', 1],
  ])('%s с buttons=%i не переключает предпросмотр', (type, buttons) => {
    expect(shouldSwapPreview(type, buttons)).toBe(false);
  });
});
