import { describe, expect, it } from 'vitest';

import { hasScreenFooter } from '../src/core/ui/Picker/usePickerView/hasScreenFooter';

describe('hasScreenFooter', () => {
  it('«Добавить стикеры» — с футером: строка статуса встаёт над «Импорт» и «Сохранить»', () => {
    expect(hasScreenFooter('add')).toBe(true);
  });

  it('«Настройки» — без футера: строка статуса у низа панели', () => {
    expect(hasScreenFooter('settings')).toBe(false);
  });

  it('без экрана футера экрана нет', () => {
    expect(hasScreenFooter(null)).toBe(false);
  });
});
