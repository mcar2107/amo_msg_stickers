import { describe, expect, it } from 'vitest';

import { headerAction } from '../src/core/ui/Picker/SectionHeader/headerAction/headerAction';

describe('headerAction', () => {
  it('у недавних — «Очистить»', () => {
    expect(headerAction('recent')).toBe('clear');
  });

  it('у «Моих стикеров» действий нет', () => {
    expect(headerAction('custom')).toBeNull();
  });

  it('у импортированного пака — меню «…»', () => {
    expect(headerAction('tg:cats')).toBe('menu');
  });

  it('у «Избранного» действий нет: элемент убирается только пунктом меню ячейки', () => {
    expect(headerAction('favorite')).toBeNull();
  });
});
