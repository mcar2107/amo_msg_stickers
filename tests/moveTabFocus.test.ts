import { describe, expect, it } from 'vitest';

import { nextIndex } from '@ui/moveTabFocus';

describe('nextIndex', () => {
  it('стрелка вправо переводит на следующую вкладку', () => {
    expect(nextIndex('ArrowRight', 1, 4)).toBe(2);
  });

  it('стрелка вправо с последней вкладки уходит на первую', () => {
    expect(nextIndex('ArrowRight', 3, 4)).toBe(0);
  });

  it('стрелка влево переводит на предыдущую вкладку', () => {
    expect(nextIndex('ArrowLeft', 2, 4)).toBe(1);
  });

  it('стрелка влево с первой вкладки уходит на последнюю', () => {
    expect(nextIndex('ArrowLeft', 0, 4)).toBe(3);
  });

  it('Home переводит на первую вкладку', () => {
    expect(nextIndex('Home', 2, 4)).toBe(0);
  });

  it('End переводит на последнюю вкладку', () => {
    expect(nextIndex('End', 1, 4)).toBe(3);
  });

  it('другая клавиша фокус не двигает', () => {
    expect(nextIndex('Enter', 1, 4)).toBeNull();
  });
});
