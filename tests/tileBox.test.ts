import { describe, expect, it } from 'vitest';

import { columnWidth, tileBox } from '@ui/MasonryGrid/tileBox';

describe('columnWidth', () => {
  it('делит ширину ленты на две колонки за вычетом зазора 4 px', () => {
    expect(columnWidth(344)).toBe(170);
  });

  it('у пустой ширины колонок нет', () => {
    expect(columnWidth(0)).toBe(0);
  });
});

describe('tileBox', () => {
  it('ставит левую колонку к левому краю', () => {
    expect(tileBox({ column: 0, top: 10, height: 85 }, 170)).toEqual({
      left: 0,
      top: 10,
      width: 170,
      height: 85,
    });
  });

  it('сдвигает правую колонку на ширину левой и зазор', () => {
    expect(tileBox({ column: 1, top: 0, height: 170 }, 170)).toEqual({
      left: 174,
      top: 0,
      width: 170,
      height: 170,
    });
  });
});
