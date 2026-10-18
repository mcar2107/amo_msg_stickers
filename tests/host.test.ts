import { describe, expect, it } from 'vitest';

import { pickSettings } from '@core/host';

describe('pickSettings', () => {
  it('оставляет известные поля со строковыми значениями', () => {
    expect(pickSettings({ giphyKey: 'g', telegramToken: 't' })).toEqual({
      giphyKey: 'g',
      telegramToken: 't',
    });
  });

  it('отбрасывает чужие поля и нестроковые значения', () => {
    expect(pickSettings({ giphyKey: 42, klipyKey: null, extra: 'x' })).toEqual({});
  });

  it.each([undefined, null, 'giphyKey', 42])('не объект %s — пусто', (value) => {
    expect(pickSettings(value)).toEqual({});
  });
});
