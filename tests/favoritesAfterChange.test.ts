import { describe, expect, it } from 'vitest';

import type { FavoriteRec } from '@core/db.types';
import { favoritesAfterChange } from '@ui/PickerProvider/useFavorites';

/**
 * @param stickerId — id стикера
 * @param ts — время добавления
 * @returns запись избранного стикера
 */
const favorite = (stickerId: string, ts: number): FavoriteRec => {
  return {
    key: `l:${stickerId}`,
    ts,
    item: { kind: 'local', stickerId },
    sticker: {
      id: stickerId,
      packId: 'custom',
      blob: new Blob(),
      width: 512,
      height: 512,
      createdAt: 1,
    },
  };
};

/**
 * @param records — записи избранного
 * @returns ключи записей по порядку
 */
const keysOf = (records: FavoriteRec[]): string[] => {
  return records.map(({ key }) => {
    return key;
  });
};

describe('favoritesAfterChange', () => {
  it('добавление ставит запись первой', () => {
    const next = favoritesAfterChange(
      [favorite('a', 2), favorite('b', 1)],
      'l:c',
      favorite('c', 3)
    );

    expect(keysOf(next)).toEqual(['l:c', 'l:a', 'l:b']);
  });

  it('добавление до первого чтения даёт список из одной записи', () => {
    expect(keysOf(favoritesAfterChange(null, 'l:c', favorite('c', 3)))).toEqual(['l:c']);
  });

  it('повторное добавление не дублирует запись и поднимает её наверх', () => {
    const next = favoritesAfterChange(
      [favorite('a', 2), favorite('b', 1)],
      'l:b',
      favorite('b', 5)
    );

    expect(keysOf(next)).toEqual(['l:b', 'l:a']);
    expect(next[0]?.ts).toBe(5);
  });

  it('удаление убирает запись по ключу', () => {
    const next = favoritesAfterChange([favorite('a', 2), favorite('b', 1)], 'l:a', null);

    expect(keysOf(next)).toEqual(['l:b']);
  });

  it('удаление отсутствующего ключа не меняет список', () => {
    const prev = [favorite('a', 2)];

    expect(keysOf(favoritesAfterChange(prev, 'l:z', null))).toEqual(['l:a']);
    expect(favoritesAfterChange(null, 'l:z', null)).toEqual([]);
  });

  it('исходный список не меняется', () => {
    const prev = [favorite('a', 2)];

    favoritesAfterChange(prev, 'l:c', favorite('c', 3));
    favoritesAfterChange(prev, 'l:a', null);
    expect(keysOf(prev)).toEqual(['l:a']);
  });
});
