import { describe, expect, it } from 'vitest';

import {
  containRect,
  EMOJI_LEAVE_MS,
  EMOJI_POP_DELAY_MS,
  flyTransform,
  PREVIEW_FLY_MS,
  PREVIEW_LEAVE_MS,
} from '../src/core/ui/Picker/Preview/previewMotion/previewMotion';

describe('flyTransform', () => {
  it('ячейка 50×50 в левом верхнем углу → квадрат 400×400 по центру окна', () => {
    const from = { left: 100, top: 200, width: 50, height: 50 };
    const to = { left: 440, top: 200, width: 400, height: 400 };

    // центры: (125, 225) и (640, 400)
    expect(flyTransform(from, to)).toBe('translate(-515px, -175px) scale(0.125)');
  });

  it('совпавшие прямоугольники — тождественная трансформация', () => {
    const rect = { left: 10, top: 20, width: 100, height: 100 };

    expect(flyTransform(rect, rect)).toBe('translate(0px, 0px) scale(1)');
  });

  it('масштаб — по большей стороне ячейки: широкая GIF 180×120', () => {
    const from = { left: 0, top: 0, width: 180, height: 120 };
    const to = { left: 0, top: 0, width: 400, height: 400 };

    expect(flyTransform(from, to)).toBe('translate(-110px, -140px) scale(0.45)');
  });

  it('высокая ячейка: масштаб по высоте', () => {
    const from = { left: 0, top: 0, width: 120, height: 180 };
    const to = { left: 0, top: 0, width: 400, height: 400 };

    expect(flyTransform(from, to)).toBe('translate(-140px, -110px) scale(0.45)');
  });

  it.each([
    ['ячейка без размера', { left: 0, top: 0, width: 0, height: 0 }],
    ['ячейка нулевой ширины и высоты', { left: 5, top: 5, width: 0, height: 0 }],
  ])('%s: полёта нет', (_name, from) => {
    const to = { left: 0, top: 0, width: 400, height: 400 };

    expect(flyTransform(from, to)).toBeNull();
  });

  it('квадрат предпросмотра без размера: полёта нет', () => {
    const from = { left: 0, top: 0, width: 50, height: 50 };

    expect(flyTransform(from, { left: 0, top: 0, width: 0, height: 0 })).toBeNull();
  });
});

describe('containRect', () => {
  /**
   * Элемент превью черновика: вся зона загрузки 300×100 со смещением от края окна.
   */
  const ZONE = { left: 20, top: 40, width: 300, height: 100 };

  it('картинка шире зоны по пропорциям: во всю ширину, поля сверху и снизу', () => {
    expect(containRect(ZONE, 512, 128)).toEqual({
      left: 20,
      top: 52.5,
      width: 300,
      height: 75,
    });
  });

  it('картинка выше зоны по пропорциям: во всю высоту, поля слева и справа', () => {
    expect(containRect(ZONE, 512, 512)).toEqual({
      left: 120,
      top: 40,
      width: 100,
      height: 100,
    });
  });

  it('высокая картинка 100×400 в зоне: ширина 25 по центру', () => {
    expect(containRect(ZONE, 100, 400)).toEqual({
      left: 157.5,
      top: 40,
      width: 25,
      height: 100,
    });
  });

  it('та же пропорция: весь элемент, мелкая картинка растянута до него', () => {
    expect(containRect(ZONE, 30, 10)).toEqual(ZONE);
  });

  it.each([
    ['не загружена', 0, 0],
    ['без ширины', 0, 128],
    ['без высоты', 512, 0],
  ])('картинка %s: весь прямоугольник элемента', (_name, naturalWidth, naturalHeight) => {
    expect(containRect(ZONE, naturalWidth, naturalHeight)).toEqual(ZONE);
  });

  it('элемент без размера: прямоугольник как есть, без деления на ноль', () => {
    const empty = { left: 5, top: 5, width: 0, height: 0 };

    expect(containRect(empty, 512, 512)).toEqual(empty);
  });

  it('вписанный прямоугольник даёт полёт видимой картинки, а не зоны', () => {
    const preview = { left: 0, top: 0, width: 400, height: 400 };
    const square = containRect(ZONE, 512, 512);

    // квадрат 100×100 в центре зоны (170, 90) → квадрат 400 с центром (200, 200)
    expect(flyTransform(square, preview)).toBe('translate(-30px, -110px) scale(0.25)');
    expect(flyTransform(ZONE, preview)).toBe('translate(-30px, -110px) scale(0.75)');
  });
});

describe('тайминг открытия', () => {
  it('эмодзи стартует вслед за картинкой', () => {
    expect(EMOJI_POP_DELAY_MS).toBeGreaterThan(0);
  });

  it('возврат в ячейку не длиннее вылета', () => {
    expect(PREVIEW_LEAVE_MS).toBeLessThanOrEqual(PREVIEW_FLY_MS);
    expect(EMOJI_LEAVE_MS).toBeLessThanOrEqual(PREVIEW_LEAVE_MS);
  });
});
