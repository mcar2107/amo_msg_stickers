import { describe, expect, it } from 'vitest';

import { headerAction } from '../src/core/ui/Picker/SectionHeader/headerAction/headerAction';

describe('headerAction', () => {
  it('у недавних — «Очистить»', () => {
    expect(headerAction('recent', true)).toBe('clear');
  });

  it('у «Моих стикеров» со стикерами — меню только с «Выгрузить пак»', () => {
    expect(headerAction('custom', true)).toBe('exportMenu');
  });

  it('у пустых «Моих стикеров» действий нет', () => {
    expect(headerAction('custom', false)).toBeNull();
  });

  it('у импортированного пака — меню «…», со стикерами и без', () => {
    expect(headerAction('tg:cats', true)).toBe('menu');
    expect(headerAction('tg:cats', false)).toBe('menu');
  });
});
