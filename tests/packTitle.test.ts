import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '@core/i18n';
import { packTitle } from '@core/packTitle';

afterEach(() => {
  setLocale('ru');
});

describe('packTitle', () => {
  it('свой пак, созданный по-русски, на английском называется «My stickers»', () => {
    setLocale('en');

    expect(packTitle({ id: 'custom', title: 'Мои стикеры' })).toBe('My stickers');
  });

  it('свой пак, созданный по-английски, на русском называется «Мои стикеры»', () => {
    expect(packTitle({ id: 'custom', title: 'My stickers' })).toBe('Мои стикеры');
  });

  it('пак Telegram называется своим названием на любом языке', () => {
    setLocale('en');

    expect(packTitle({ id: 'tg:cats', title: 'Коты' })).toBe('Коты');
  });
});
