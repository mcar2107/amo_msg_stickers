import { describe, expect, it } from 'vitest';

import type { RecentKind } from '@core/db.types';
import { keepNewestByKind, RECENT_LIMIT } from '@core/itemKey';

/**
 * Элемент недавних для проверки отбора: вид, время и имя для сверки порядка.
 */
type Item = {
  /**
   * Вид недавних.
   */
  kind: RecentKind;

  /**
   * Время отправки.
   */
  ts: number;

  /**
   * Имя элемента в проверке.
   */
  name: string;
};

/**
 * @param item — элемент
 * @returns его вид
 */
const kindOf = (item: Item) => {
  return item.kind;
};

/**
 * @param items — элементы
 * @returns их имена по порядку
 */
const names = (items: Item[]) => {
  return items.map(({ name }) => {
    return name;
  });
};

describe('keepNewestByKind', () => {
  it('держит лимит каждого вида отдельно, от новых к старым', () => {
    const stickers = Array.from({ length: RECENT_LIMIT + 2 }, (_, n): Item => {
      return { kind: 'sticker', ts: n, name: `s${n}` };
    });
    const gifs: Item[] = [{ kind: 'gif', ts: 1000, name: 'g' }];
    const { kept, overflow } = keepNewestByKind([...stickers, ...gifs], kindOf);

    expect(kept).toHaveLength(RECENT_LIMIT + 1);
    expect(kept[0]?.name).toBe('g');
    expect(names(overflow)).toEqual(['s1', 's0']);
  });

  it('при равном времени остаётся тот, что раньше во входном порядке', () => {
    const items = Array.from({ length: RECENT_LIMIT + 1 }, (_, n): Item => {
      return { kind: 'gif', ts: 5, name: `g${n}` };
    });
    const { kept, overflow } = keepNewestByKind(items, kindOf);

    expect(kept[0]?.name).toBe('g0');
    expect(names(overflow)).toEqual([`g${RECENT_LIMIT}`]);
  });

  it('не меняет входной массив', () => {
    const items: Item[] = [
      { kind: 'gif', ts: 1, name: 'old' },
      { kind: 'gif', ts: 2, name: 'new' },
    ];

    keepNewestByKind(items, kindOf);

    expect(names(items)).toEqual(['old', 'new']);
  });
});
