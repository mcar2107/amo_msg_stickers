import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '../src/core/i18n/translate';
import { packCardCount } from '../src/core/ui/Picker/AddView/TelegramImport/PackCard/packCardCount/packCardCount';

describe('packCardCount', () => {
  afterEach(() => {
    setLocale('ru');
  });

  it('до импорта — число стикеров пака', () => {
    expect(
      packCardCount({ status: 'preview', title: 'Котики', total: 45, isInLibrary: false })
    ).toBe('Стикеров: 45');
  });

  it('во время импорта — «обработано/всего» на месте числа', () => {
    expect(
      packCardCount({ status: 'importing', title: 'Котики', total: 34, done: 12 })
    ).toBe('12/34');
  });

  it('по-английски', () => {
    setLocale('en');

    expect(
      packCardCount({ status: 'preview', title: 'Котики', total: 45, isInLibrary: true })
    ).toBe('Stickers: 45');
  });
});
