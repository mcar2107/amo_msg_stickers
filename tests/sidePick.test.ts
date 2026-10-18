import { describe, expect, it } from 'vitest';

import {
  MAX_GIF_BYTES,
  pickSide,
  SAFETY,
  SAMPLE_FRAMES,
  sampleIndices,
  sideLadder,
} from '@core/sidePick';

const MB = 1024 * 1024;

/**
 * Вес пробы, при котором оценка для стороны источника равна `estimate` байт до `SAFETY`:
 * проба из `SAMPLE_FRAMES` кадров, в плане столько же кадров.
 *
 * @param estimate — желаемая оценка веса GIF в стороне источника без запаса
 * @returns вес пробы в байтах
 */
const sampleFor = (estimate: number) => {
  return Math.round(estimate / SAFETY);
};

describe('sideLadder', () => {
  it('512 → вся лестница', () => {
    expect(sideLadder(512)).toEqual([512, 384, 320, 256]);
  });

  it('источник 300 px → [300, 256], без увеличения', () => {
    expect(sideLadder(300)).toEqual([300, 256]);
  });

  it('источник 384 px не повторяет свою сторону', () => {
    expect(sideLadder(384)).toEqual([384, 320, 256]);
  });

  it('источник меньше 256 px — только он', () => {
    expect(sideLadder(200)).toEqual([200]);
  });
});

describe('pickSide', () => {
  it('оценка укладывается в 512 → 512', () => {
    expect(pickSide(sampleFor(1.5 * MB), SAMPLE_FRAMES, SAMPLE_FRAMES, 512)).toBe(512);
  });

  /**
   * Сценарий спеки «Тяжёлая анимация»: в 512 оценка 3 МБ, а по площади в 384 — 1,69 МБ.
   * При линейной зависимости от стороны вышло бы 2,25 МБ и выбор 320.
   */
  it('тяжёлая анимация → 384: вес растёт с площадью, а не со стороной', () => {
    expect(pickSide(sampleFor(3 * MB), SAMPLE_FRAMES, SAMPLE_FRAMES, 512)).toBe(384);
  });

  it('пересчитывает пробу на число кадров плана', () => {
    /**
     * 8 пробных кадров по 0,15 МБ, в плане 100 кадров: в 512 — 16,5 МБ, в 256 — 4,1 МБ.
     */
    expect(pickSide(1.2 * MB, SAMPLE_FRAMES, 100, 512)).toBe(256);

    /**
     * 8 пробных кадров по 0,045 МБ, в плане 100 кадров: в 512 — 4,95 МБ, в 384 — 2,78 МБ,
     * в 320 — 1,93 МБ.
     */
    expect(pickSide(0.36 * MB, SAMPLE_FRAMES, 100, 512)).toBe(320);
  });

  it('лимит недостижим и в 256 → 256', () => {
    expect(pickSide(sampleFor(10 * MB), SAMPLE_FRAMES, SAMPLE_FRAMES, 512)).toBe(256);
  });

  it('не укладывается ни в одну сторону ряда 300 → 256', () => {
    expect(pickSide(sampleFor(5 * MB), SAMPLE_FRAMES, SAMPLE_FRAMES, 300)).toBe(256);
  });

  /**
   * Оценка округляется до целых байт вверх: 1 906 501 × 1,1 ≈ 2 097 151,1 → ровно 2 МБ,
   * 1 906 502 × 1,1 ≈ 2 097 152,2 → на байт больше.
   */
  it('граница ровно 2 МБ укладывается, байт сверху — нет', () => {
    expect(MAX_GIF_BYTES).toBe(2 * MB);
    expect(pickSide(1_906_501, 1, 1, 512)).toBe(512);
    expect(pickSide(1_906_502, 1, 1, 512)).toBe(384);
  });

  it('без пробы — сторона источника', () => {
    expect(pickSide(0, 0, 100, 512)).toBe(512);
  });
});

describe('sampleIndices', () => {
  it.each([9, 10, 25, 75, 100])('план из %i кадров', (frameCount) => {
    const indices = sampleIndices(frameCount);

    expect(indices).toHaveLength(SAMPLE_FRAMES);
    expect(new Set(indices).size).toBe(SAMPLE_FRAMES);
    expect(indices[0]).toBe(0);
    expect(indices.at(-1)).toBe(frameCount - 1);
    expect(indices).toEqual(
      [...indices].sort((a, b) => {
        return a - b;
      })
    );
    expect(indices.every(Number.isInteger)).toBe(true);
  });

  it('равномерно: соседние пробы не дальше шага плана с округлением', () => {
    const indices = sampleIndices(100);
    const step = 99 / (SAMPLE_FRAMES - 1);

    indices.slice(1).forEach((index, i) => {
      expect(index - (indices[i] || 0)).toBeLessThanOrEqual(Math.ceil(step));
      expect(index - (indices[i] || 0)).toBeGreaterThanOrEqual(Math.floor(step));
    });
  });

  it('план не длиннее пробы — все кадры', () => {
    expect(sampleIndices(SAMPLE_FRAMES)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(sampleIndices(3)).toEqual([0, 1, 2]);
    expect(sampleIndices(1)).toEqual([0]);
    expect(sampleIndices(0)).toEqual([]);
  });
});
