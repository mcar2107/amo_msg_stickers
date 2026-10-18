import { describe, expect, it } from 'vitest';

import { isRepeatClick } from '@ui/AddView/ImportFooter/isRepeatClick';

describe('isRepeatClick', () => {
  it('второй клик двойного клика — повтор', () => {
    expect(isRepeatClick(2)).toBe(true);
  });

  it('одиночный клик мышью — не повтор', () => {
    expect(isRepeatClick(1)).toBe(false);
  });

  it('нажатие с клавиатуры — не повтор', () => {
    expect(isRepeatClick(0)).toBe(false);
  });
});
