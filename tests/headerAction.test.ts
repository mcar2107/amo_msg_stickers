import { describe, expect, it } from 'vitest';

import { headerAction } from '@ui/SectionHeader/headerAction';

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

  it('у «Избранного» действий нет: элемент убирается только пунктом меню ячейки', () => {
    expect(headerAction('favorite', true)).toBeNull();
    expect(headerAction('favorite', false)).toBeNull();
  });
});
