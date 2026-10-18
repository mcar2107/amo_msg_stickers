import { describe, expect, it } from 'vitest';

import type {
  ColumnGeometry,
  MasonrySection,
  MasonryTile,
  SizedItem,
} from '@ui/MasonryGrid/splitColumns';
import { splitColumns, visibleTiles } from '@ui/MasonryGrid/splitColumns';

type Item = SizedItem & {
  /**
   * Номер в порядке выдачи.
   */
  id: number;
};

/**
 * Две колонки по 100 px с зазором 4 px.
 */
const GEOMETRY: ColumnGeometry = { count: 2, width: 100, gap: 4 };

/**
 * Элемент ленты с номером и размерами.
 *
 * @param id — номер в порядке выдачи
 * @param width — ширина
 * @param height — высота
 * @returns элемент
 */
const item = (id: number, width: number, height: number): Item => {
  return { id, width, height };
};

/**
 * Квадратные элементы с номерами `from…to−1`.
 *
 * @param from — первый номер
 * @param to — номер за последним
 * @returns элементы
 */
const squares = (from: number, to: number): Item[] => {
  return Array.from({ length: to - from }, (_, index) => {
    return item(from + index, 100, 100);
  });
};

/**
 * Плитка одной строкой: вид, номер элемента или заглушки, колонка, верх, высота.
 *
 * @param tile — плитка
 * @returns строка для сравнения
 */
const describeTile = (tile: MasonryTile<Item>): string => {
  const { column, top, height } = tile;

  switch (tile.kind) {
    case 'item': {
      return `item ${tile.item.id} c${column} ${top}+${height}`;
    }

    case 'skeleton': {
      return `skeleton ${tile.index} c${column} ${top}+${height}`;
    }

    case 'header': {
      return `header ${tile.sectionId} ${top}+${height}`;
    }

    default: {
      throw new Error('Неизвестный вид плитки');
    }
  }
};

/**
 * Раскладка разделов строками плиток.
 *
 * @param sections — разделы
 * @returns плитки строками
 */
const layout = (sections: MasonrySection<Item>[]): string[] => {
  return splitColumns(sections, GEOMETRY).tiles.map(describeTile);
};

describe('splitColumns', () => {
  it('одинаковые элементы идут по порядку слева направо, строка за строкой, через зазор', () => {
    expect(layout([{ id: 'trends', items: squares(0, 5) }])).toEqual([
      'item 0 c0 0+100',
      'item 1 c1 0+100',
      'item 2 c0 104+100',
      'item 3 c1 104+100',
      'item 4 c0 208+100',
    ]);
  });

  it('следующий элемент уходит в колонку, короче с учётом зазоров', () => {
    const items = [item(0, 100, 305), ...squares(1, 5)];

    expect(layout([{ id: 'trends', items }])).toEqual([
      'item 0 c0 0+305',
      'item 1 c1 0+100',
      'item 2 c1 104+100',
      'item 3 c1 208+100',
      'item 4 c0 309+100',
    ]);
  });

  it('высота — по пропорциям элемента при ширине колонки', () => {
    expect(layout([{ id: 'trends', items: [item(0, 400, 200)] }])).toEqual([
      'item 0 c0 0+50',
    ]);
  });

  it('заголовок раздела — строка 32 px под самой длинной колонкой предыдущего', () => {
    expect(
      layout([
        { id: 'recent', items: squares(0, 3), hasHeader: true },
        { id: 'trends', items: squares(3, 5), hasHeader: true },
      ])
    ).toEqual([
      'header recent 0+32',
      'item 0 c0 32+100',
      'item 1 c1 32+100',
      'item 2 c0 136+100',
      'header trends 236+32',
      'item 3 c0 268+100',
      'item 4 c1 268+100',
    ]);
  });

  it('раздел без заголовка начинается через зазор под предыдущим', () => {
    expect(
      layout([
        { id: 'recent', items: squares(0, 1) },
        { id: 'trends', items: squares(1, 2) },
      ])
    ).toEqual(['item 0 c0 0+100', 'item 1 c0 104+100']);
  });

  it('заглушки — в конце каждой колонки, после элементов', () => {
    expect(layout([{ id: 'trends', items: squares(0, 3), skeletons: 2 }])).toEqual([
      'item 0 c0 0+100',
      'item 1 c1 0+100',
      'item 2 c0 104+100',
      'skeleton 0 c0 208+100',
      'skeleton 1 c1 104+100',
      'skeleton 2 c0 312+100',
      'skeleton 3 c1 208+100',
    ]);
  });

  it('первая загрузка — сетка заглушек', () => {
    expect(layout([{ id: 'trends', items: [], skeletons: 2 }])).toEqual([
      'skeleton 0 c0 0+100',
      'skeleton 1 c1 0+100',
      'skeleton 2 c0 104+100',
      'skeleton 3 c1 104+100',
    ]);
  });

  it('total — низ самой длинной колонки', () => {
    expect(splitColumns([{ id: 'trends', items: squares(0, 3) }], GEOMETRY).total).toBe(
      204
    );
    expect(
      splitColumns([{ id: 'trends', items: squares(0, 3), skeletons: 2 }], GEOMETRY).total
    ).toBe(412);
  });

  it('дописанная страница не сдвигает уже показанные элементы', () => {
    const first = [
      item(0, 100, 150),
      item(1, 100, 80),
      item(2, 200, 100),
      item(3, 100, 120),
    ];
    const next = [item(4, 100, 100), item(5, 300, 100), item(6, 100, 200)];

    const before = splitColumns(
      [
        { id: 'recent', items: squares(10, 11), hasHeader: true },
        { id: 'trends', items: first, hasHeader: true, skeletons: 2 },
      ],
      GEOMETRY
    ).tiles.filter(({ kind }) => {
      return kind !== 'skeleton';
    });
    const after = splitColumns(
      [
        { id: 'recent', items: squares(10, 11), hasHeader: true },
        { id: 'trends', items: [...first, ...next], hasHeader: true },
      ],
      GEOMETRY
    ).tiles;

    expect(after.slice(0, before.length)).toEqual(before);
  });

  it('без разделов — пустая лента', () => {
    expect(splitColumns([], GEOMETRY)).toEqual({ tiles: [], total: 0 });
  });
});

describe('visibleTiles', () => {
  const { tiles } = splitColumns(
    [{ id: 'trends', items: squares(0, 5), hasHeader: true }],
    GEOMETRY
  );

  /**
   * Плитки окна строками.
   *
   * @param scrollTop — прокрутка
   * @param viewport — высота видимой области
   * @param overscan — запас
   * @returns плитки окна
   */
  const tilesAt = (scrollTop: number, viewport: number, overscan: number): string[] => {
    return visibleTiles(tiles, scrollTop, viewport, overscan).map(describeTile);
  };

  it('плитки, пересекающие видимую область, в порядке выдачи', () => {
    expect(tilesAt(150, 10, 0)).toEqual(['item 2 c0 136+100', 'item 3 c1 136+100']);
  });

  it('плитка, которая только касается границы, не входит', () => {
    expect(tilesAt(132, 4, 0)).toEqual([]);
    expect(tilesAt(0, 32, 0)).toEqual(['header trends 0+32']);
  });

  it('запас расширяет окно в обе стороны', () => {
    expect(tilesAt(150, 10, 100)).toEqual([
      'item 0 c0 32+100',
      'item 1 c1 32+100',
      'item 2 c0 136+100',
      'item 3 c1 136+100',
      'item 4 c0 240+100',
    ]);
  });

  it('за концом ленты — пустое окно', () => {
    expect(tilesAt(340, 100, 0)).toEqual([]);
  });
});
