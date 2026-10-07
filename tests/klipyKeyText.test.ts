import { describe, expect, it } from 'vitest';

import { klipyKeyText } from '../src/core/ui/Picker/SettingsView/klipyKeyText/klipyKeyText';

describe('klipyKeyText', () => {
  it('со встроенным ключом — свой необязателен, поиск KLIPY без ключа', () => {
    expect(klipyKeyText(true)).toEqual({
      label: 'settings.klipy.labelOptional',
      hint: 'settings.klipy.whereOptional',
      note: 'settings.gif.builtinNote',
    });
  });

  it('без встроенного — литерал подписи, тестовый ключ и «хватит одного»', () => {
    expect(klipyKeyText(false)).toEqual({
      label: null,
      hint: 'settings.klipy.where',
      note: 'settings.gif.oneKey',
    });
  });
});
