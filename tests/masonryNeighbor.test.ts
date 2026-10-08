import { describe, expect, it } from 'vitest';

import { masonryNeighbor } from '../src/core/ui/Picker/MasonryGrid/masonryNeighbor/masonryNeighbor';
import { splitColumns } from '../src/core/ui/Picker/MasonryGrid/splitColumns/splitColumns';
import type {
  MasonryTile,
  SizedItem,
} from '../src/core/ui/Picker/MasonryGrid/splitColumns/splitColumns.types';
import type { PreviewDirection } from '../src/core/ui/Picker/Preview/previewDirection/previewDirection.types';

type Item = SizedItem & {
  /**
   * Ключ GIF — уникален только в разделе.
   */
  key: string;
};

/**
 * GIF шириной 100 px.
 *
 * @param key — ключ
 * @param height — высота
 * @returns элемент выдачи
 */
const gif = (key: string, height = 100): Item => {
  return { key, width: 100, height };
};

/**
 * id кнопки ячейки: ключ уникален только в разделе, поэтому в id входит раздел.
 *
 * @param sectionId — раздел ячейки
 * @param item — GIF
 * @returns id ячейки
 */
const idOf = (sectionId: string, { key }: Item): string => {
  return `${sectionId}/${key}`;
};

/**
 * Две колонки. Недавние с заголовком: g0, g2, g4 — в левой, g1 (высокая) и g3 — в правой.
 * Выдача с заголовком и заглушками: g0 (та же GIF, что в недавних) и t2 — в левой, t1 — в правой.
 * Следующая страница — одни заглушки.
 */
const TILES: MasonryTile<Item>[] = splitColumns(
  [
    {
      id: 'recent',
      hasHeader: true,
      items: [gif('g0'), gif('g1', 200), gif('g2'), gif('g3'), gif('g4')],
    },
    {
      id: 'trends',
      hasHeader: true,
      items: [gif('g0'), gif('t1'), gif('t2')],
      skeletons: 1,
    },
    { id: 'more', items: [], skeletons: 2 },
  ],
  { count: 2, width: 100, gap: 4 }
).tiles;

/**
 * id соседа в ленте `TILES`.
 *
 * @param id — id текущей ячейки
 * @param direction — направление шага
 * @returns id соседа; `null` — соседа нет
 */
const neighbourId = (id: string, direction: PreviewDirection): string | null => {
  const neighbour = masonryNeighbor(TILES, id, direction, idOf);

  return neighbour && idOf(neighbour.sectionId, neighbour.item);
};

describe('masonryNeighbor', () => {
  it('колонки раскладки — как в описании ленты', () => {
    const columns = TILES.reduce<string[]>((acc, tile) => {
      if (tile.kind === 'item')
        acc.push(`${idOf(tile.sectionId, tile.item)}:${tile.column}`);

      return acc;
    }, []);

    expect(columns).toEqual([
      'recent/g0:0',
      'recent/g1:1',
      'recent/g2:0',
      'recent/g3:1',
      'recent/g4:0',
      'trends/g0:0',
      'trends/t1:1',
      'trends/t2:0',
    ]);
  });

  it.each([
    ['recent/g0', 'right', 'recent/g1'],
    ['recent/g1', 'left', 'recent/g0'],
    ['recent/g4', 'right', 'trends/g0'],
    ['trends/g0', 'left', 'recent/g4'],
    ['trends/g0', 'right', 'trends/t1'],
  ] as const)(
    '%s, %s → %s: порядок выдачи через границу разделов',
    (id, direction, expected) => {
      expect(neighbourId(id, direction)).toBe(expected);
    }
  );

  it.each([
    ['recent/g0', 'down', 'recent/g2'],
    ['recent/g1', 'down', 'recent/g3'],
    ['recent/g2', 'down', 'recent/g4'],
    ['recent/g4', 'down', 'trends/g0'],
    ['recent/g3', 'down', 'trends/t1'],
    ['trends/g0', 'down', 'trends/t2'],
    ['trends/t1', 'up', 'recent/g3'],
    ['trends/g0', 'up', 'recent/g4'],
    ['recent/g4', 'up', 'recent/g2'],
  ] as const)('%s, %s → %s: плитка той же колонки', (id, direction, expected) => {
    expect(neighbourId(id, direction)).toBe(expected);
  });

  it.each([
    ['recent/g0', 'left'],
    ['recent/g0', 'up'],
    ['recent/g1', 'up'],
    ['trends/t2', 'right'],
    ['trends/t2', 'down'],
    ['trends/t1', 'down'],
  ] as const)('%s, %s — край ленты, заглушки и заголовки не в счёт', (id, direction) => {
    expect(neighbourId(id, direction)).toBeNull();
  });

  it('ячейки нет в раскладке — соседа нет', () => {
    expect(neighbourId('trends/g1', 'right')).toBeNull();
    expect(masonryNeighbor([], 'recent/g0', 'right', idOf)).toBeNull();
  });

  it('сосед — плитка с геометрией: по ней считается прокрутка', () => {
    const neighbour = masonryNeighbor(TILES, 'recent/g4', 'down', idOf);
    const tile = TILES.find((candidate) => {
      return (
        candidate.kind === 'item' &&
        idOf(candidate.sectionId, candidate.item) === 'trends/g0'
      );
    });

    expect(neighbour).toBe(tile);
  });
});
