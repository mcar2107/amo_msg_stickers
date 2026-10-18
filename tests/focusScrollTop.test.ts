import { describe, expect, it } from 'vitest';

import { focusScrollTop } from '@ui/Screen/useScreenFocus';

describe('focusScrollTop', () => {
  it('группа уже видна — тело не сдвигается', () => {
    expect(
      focusScrollTop({
        group: { top: 40, height: 100 },
        target: { top: 90, height: 32 },
        scrollTop: 0,
        viewport: 275,
      })
    ).toBe(0);
  });

  it('группа ниже видимой области — встаёт низом к низу области', () => {
    expect(
      focusScrollTop({
        group: { top: 420, height: 140 },
        target: { top: 480, height: 32 },
        scrollTop: 0,
        viewport: 275,
      })
    ).toBe(285);
  });

  it('группа выше области — встаёт верхом к верху', () => {
    expect(
      focusScrollTop({
        group: { top: 20, height: 100 },
        target: { top: 60, height: 32 },
        scrollTop: 200,
        viewport: 275,
      })
    ).toBe(20);
  });

  it('группа выше области целиком не помещается — цель всё равно видна', () => {
    expect(
      focusScrollTop({
        group: { top: 100, height: 400 },
        target: { top: 440, height: 32 },
        scrollTop: 0,
        viewport: 275,
      })
    ).toBe(197);
  });
});
