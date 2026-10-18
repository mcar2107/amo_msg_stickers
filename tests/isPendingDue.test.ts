import { describe, expect, it } from 'vitest';

import { isPendingDue } from '../src/core/ui/Picker/useRemovalFocus/isPendingDue';
import type { PendingFocus } from '../src/core/ui/Picker/useRemovalFocus/useRemovalFocus.types';

/**
 * Лента и данные правки до неё.
 */
const FEED = ['a', 'b'];
const ASKED = ['favorite-a'];

/**
 * Ожидание фокуса с одной целью.
 *
 * @param shouldWaitRevision — ждать ли ленту из новых данных правки
 * @returns ожидание
 */
const pending = (shouldWaitRevision: boolean): PendingFocus<string[]> => {
  return {
    targets: [{ kind: 'cell', sectionId: 'favorite', key: 'a' }],
    feed: FEED,
    revision: ASKED,
    shouldWaitRevision,
  };
};

describe('isPendingDue', () => {
  it('та же лента — ждать дальше', () => {
    expect(isPendingDue(pending(false), FEED, ASKED)).toBe(false);
    expect(isPendingDue(pending(true), FEED, ['favorite-b'])).toBe(false);
  });

  it('удаление применяется к первой новой ленте', () => {
    expect(isPendingDue(pending(false), ['b'], ASKED)).toBe(true);
  });

  it('правку не тратит чужая перестройка из прежних данных — подгрузка выдачи', () => {
    expect(isPendingDue(pending(true), ['a', 'b', 'trend'], ASKED)).toBe(false);
  });

  it('правка применяется к ленте из новых данных', () => {
    expect(isPendingDue(pending(true), ['b', 'trend'], ['favorite-b'])).toBe(true);
  });
});
