import { describe, expect, it } from 'vitest';

import { telegramTokenText } from '@ui/SettingsView/telegramTokenText';

describe('telegramTokenText', () => {
  it('со встроенным токеном — свой необязателен', () => {
    expect(telegramTokenText(true)).toEqual({
      label: 'settings.telegram.labelOptional',
      hint: 'settings.telegram.hintOptional',
    });
  });

  it('без встроенного — токен нужен для импорта', () => {
    expect(telegramTokenText(false)).toEqual({
      label: 'settings.telegram.label',
      hint: 'settings.telegram.hint',
    });
  });
});
