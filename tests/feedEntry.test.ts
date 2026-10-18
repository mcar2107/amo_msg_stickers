import { describe, expect, it } from 'vitest';

import type { EntryBox } from '@ui/feedEntry';
import { entryIndex } from '@ui/feedEntry';

/**
 * Видимая область ленты: от 1000 до 1300 px.
 */
const VIEW: EntryBox = { top: 1000, bottom: 1300 };

/**
 * Ячейки ленты в порядке документа: ряды по 100 px с 700 px — окно с запасом над и под
 * видимой областью.
 */
const BOXES: EntryBox[] = [700, 800, 900, 950, 1000, 1100, 1200, 1280, 1400].map(
  (top) => {
    return { top, bottom: top + 60 };
  }
);

describe('entryIndex', () => {
  it('Tab — первая ячейка, видимая целиком, а не первая в окне', () => {
    expect(entryIndex(BOXES, VIEW, false)).toBe(4);
  });

  it('Shift+Tab — последняя ячейка, видимая целиком', () => {
    expect(entryIndex(BOXES, VIEW, true)).toBe(6);
  });

  it('ни одна ячейка не видна целиком — −1', () => {
    expect(entryIndex(BOXES, { top: 1010, bottom: 1050 }, false)).toBe(-1);
  });

  it('пустая лента — −1', () => {
    expect(entryIndex([], VIEW, false)).toBe(-1);
  });
});
