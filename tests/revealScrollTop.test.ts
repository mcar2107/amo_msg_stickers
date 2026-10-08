import { describe, expect, it } from 'vitest';

import { revealScrollTop } from '../src/core/ui/Picker/revealScrollTop/revealScrollTop';

describe('revealScrollTop', () => {
  it('ячейка видна целиком — прокрутка не меняется', () => {
    expect(revealScrollTop(120, 60, 100, 300)).toBe(100);
    expect(revealScrollTop(100, 60, 100, 300)).toBe(100);
    expect(revealScrollTop(340, 60, 100, 300)).toBe(100);
  });

  it('ячейка выше видимой области — её верх встаёт к верху области', () => {
    expect(revealScrollTop(40, 60, 100, 300)).toBe(40);
    expect(revealScrollTop(80, 60, 100, 300)).toBe(80);
  });

  it('ячейка ниже видимой области — её низ встаёт к низу области', () => {
    expect(revealScrollTop(500, 60, 100, 300)).toBe(260);
    expect(revealScrollTop(380, 60, 100, 300)).toBe(140);
  });

  it('ячейка выше самой видимой области — её верх встаёт к верху области', () => {
    expect(revealScrollTop(500, 400, 100, 300)).toBe(500);
    expect(revealScrollTop(50, 400, 100, 300)).toBe(50);
  });
});
