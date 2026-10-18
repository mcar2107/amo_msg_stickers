import { describe, expect, it } from 'vitest';

import { nextMenuIndex } from '@ui/Menu/menuFocus';

describe('nextMenuIndex', () => {
  it('стрелка вниз ведёт к следующему пункту и с последнего на первый', () => {
    expect(nextMenuIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextMenuIndex('ArrowDown', 2, 3)).toBe(0);
  });

  it('стрелка вверх ведёт к предыдущему пункту и с первого на последний', () => {
    expect(nextMenuIndex('ArrowUp', 2, 3)).toBe(1);
    expect(nextMenuIndex('ArrowUp', 0, 3)).toBe(2);
  });

  it('без пункта в фокусе стрелки ведут к первому и последнему', () => {
    expect(nextMenuIndex('ArrowDown', -1, 3)).toBe(0);
    expect(nextMenuIndex('ArrowUp', -1, 3)).toBe(2);
  });

  it('Home и End ведут к первому и последнему пункту', () => {
    expect(nextMenuIndex('Home', 1, 3)).toBe(0);
    expect(nextMenuIndex('End', 1, 3)).toBe(2);
  });

  it('прочие клавиши и пустое меню фокус не двигают', () => {
    expect(nextMenuIndex('Enter', 1, 3)).toBeNull();
    expect(nextMenuIndex('ArrowLeft', 1, 3)).toBeNull();
    expect(nextMenuIndex('ArrowDown', -1, 0)).toBeNull();
  });
});
