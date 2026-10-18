import { describe, expect, it } from 'vitest';

import type { StickerSection } from '@ui/stickerLayout';
import { activeSection, buildStickerLayout, visibleRows } from '@ui/stickerLayout';

/**
 * Раздел с `count` стикерами-номерами.
 *
 * @param id — идентификатор раздела
 * @param count — число стикеров
 * @param hasCreateTile — раздел заканчивается плиткой «Создать стикер»
 * @returns раздел
 */
const section = (
  id: string,
  count: number,
  hasCreateTile = false
): StickerSection<number> => {
  return {
    id,
    items: Array.from({ length: count }, (_, index) => {
      return index;
    }),
    hasCreateTile,
  };
};

/**
 * Ряды с признаком плитки — геометрию проще сравнивать литералом.
 *
 * @param sections — разделы
 * @param width — ширина ленты
 * @returns вид, раздел, верх, число стикеров и признак плитки каждого ряда
 */
const tileShape = (sections: StickerSection<number>[], width: number): unknown[] => {
  return buildStickerLayout(sections, width).rows.map(
    ({ kind, sectionId, top, items, hasCreateTile }) => {
      return [kind, sectionId, top, items.length, hasCreateTile];
    }
  );
};

/**
 * Ряды без стикеров — геометрию проще сравнивать литералом.
 *
 * @param sections — разделы
 * @param width — ширина ленты
 * @returns вид, раздел, верх, высота и число стикеров каждого ряда
 */
const shape = (sections: StickerSection<number>[], width: number): unknown[] => {
  return buildStickerLayout(sections, width).rows.map(
    ({ kind, sectionId, top, height, items }) => {
      return [kind, sectionId, top, height, items.length];
    }
  );
};

/**
 * Лента на 336 px: «Мои стикеры» из 7 стикеров, пустой пак.
 * Ряды: 0–32, 32–96, 100–164, 164–196, 196–260.
 */
const SAMPLE = [section('custom', 7), section('tg:empty', 0)];

describe('buildStickerLayout', () => {
  it('сторона ячейки — ширина без четырёх зазоров по 4 px на 5 колонок', () => {
    expect(buildStickerLayout([section('custom', 1)], 336).rows[1]?.height).toBe(64);
    expect(buildStickerLayout([section('custom', 1)], 321).rows[1]?.height).toBe(61);
    expect(buildStickerLayout([section('custom', 1)], 330).rows[1]?.height).toBe(62.8);
  });

  it('ширина меньше зазоров не даёт отрицательной стороны', () => {
    expect(buildStickerLayout([section('custom', 1)], 0).rows[1]?.height).toBe(0);
  });

  it('заголовок 32 px, ряды по 5 стикеров через 4 px, неполный последний ряд', () => {
    expect(shape([section('custom', 12)], 336)).toEqual([
      ['header', 'custom', 0, 32, 0],
      ['cells', 'custom', 32, 64, 5],
      ['cells', 'custom', 100, 64, 5],
      ['cells', 'custom', 168, 64, 2],
    ]);
  });

  it('стикеры раскладываются по рядам в порядке раздела', () => {
    const { rows } = buildStickerLayout([section('custom', 7)], 336);

    expect(rows[1]?.items).toEqual([0, 1, 2, 3, 4]);
    expect(rows[2]?.items).toEqual([5, 6]);
  });

  it('пустой раздел — заголовок и пустой ряд высотой в ячейку под подсказку', () => {
    expect(shape(SAMPLE, 336)).toEqual([
      ['header', 'custom', 0, 32, 0],
      ['cells', 'custom', 32, 64, 5],
      ['cells', 'custom', 100, 64, 2],
      ['header', 'tg:empty', 164, 32, 0],
      ['cells', 'tg:empty', 196, 64, 0],
    ]);
  });

  it('sectionTops — верхи заголовков, total — низ последнего ряда', () => {
    const { sectionTops, total } = buildStickerLayout(SAMPLE, 336);

    expect(sectionTops).toEqual([
      { sectionId: 'custom', top: 0 },
      { sectionId: 'tg:empty', top: 164 },
    ]);
    expect(total).toBe(260);
  });

  it('total при дробной стороне', () => {
    expect(buildStickerLayout([section('custom', 6)], 330).total).toBeCloseTo(
      32 + 62.8 + 4 + 62.8
    );
  });

  it('пустой раздел с плиткой — один ряд с плиткой без стикеров', () => {
    expect(tileShape([section('custom', 0, true)], 336)).toEqual([
      ['header', 'custom', 0, 0, false],
      ['cells', 'custom', 32, 0, true],
    ]);
  });

  it('3 стикера — плитка в том же ряду', () => {
    expect(tileShape([section('custom', 3, true)], 336)).toEqual([
      ['header', 'custom', 0, 0, false],
      ['cells', 'custom', 32, 3, true],
    ]);
  });

  it('5 стикеров при 5 колонках — второй ряд из одной плитки', () => {
    expect(tileShape([section('custom', 5, true)], 336)).toEqual([
      ['header', 'custom', 0, 0, false],
      ['cells', 'custom', 32, 5, false],
      ['cells', 'custom', 100, 0, true],
    ]);
  });

  it('10 стикеров при 5 колонках — третий ряд из плитки, следующий раздел сдвинут на ряд', () => {
    const withTile = buildStickerLayout(
      [section('custom', 10, true), section('tg:a', 2)],
      336
    );
    const withoutTile = buildStickerLayout(
      [section('custom', 10), section('tg:a', 2)],
      336
    );

    expect(tileShape([section('custom', 10, true)], 336)).toEqual([
      ['header', 'custom', 0, 0, false],
      ['cells', 'custom', 32, 5, false],
      ['cells', 'custom', 100, 5, false],
      ['cells', 'custom', 168, 0, true],
    ]);
    expect(withTile.sectionTops).toEqual([
      { sectionId: 'custom', top: 0 },
      { sectionId: 'tg:a', top: 232 },
    ]);
    expect(withTile.sectionTops[1]?.top).toBe(
      (withoutTile.sectionTops[1]?.top || 0) + 64 + 4
    );
    expect(withTile.total).toBe(withoutTile.total + 64 + 4);
  });

  it('раздел без плитки считается как прежде, у всех его рядов плитки нет', () => {
    expect(tileShape(SAMPLE, 336)).toEqual([
      ['header', 'custom', 0, 0, false],
      ['cells', 'custom', 32, 5, false],
      ['cells', 'custom', 100, 2, false],
      ['header', 'tg:empty', 164, 0, false],
      ['cells', 'tg:empty', 196, 0, false],
    ]);
    expect(buildStickerLayout(SAMPLE, 336).total).toBe(260);
  });

  it('без разделов — пустая лента', () => {
    expect(buildStickerLayout([], 336)).toEqual({ rows: [], sectionTops: [], total: 0 });
  });
});

describe('visibleRows', () => {
  const { rows } = buildStickerLayout(SAMPLE, 336);

  it('в начале ленты — ряды, пересекающие окно', () => {
    expect(visibleRows(rows, 0, 101, 0)).toEqual([0, 3]);
  });

  it('ряд, верх которого ровно на нижней границе окна, не входит', () => {
    expect(visibleRows(rows, 0, 32, 0)).toEqual([0, 1]);
  });

  it('ряд, низ которого ровно на верхней границе окна, не входит', () => {
    expect(visibleRows(rows, 32, 64, 0)).toEqual([1, 2]);
  });

  it('scrollTop ровно на верхе ряда начинает окно с него', () => {
    expect(visibleRows(rows, 164, 32, 0)).toEqual([3, 4]);
  });

  it('запас расширяет окно в обе стороны', () => {
    expect(visibleRows(rows, 150, 50, 40)).toEqual([2, 5]);
    expect(visibleRows(rows, 164, 32, 64)).toEqual([2, 5]);
  });

  it('в конце ленты окно доходит до последнего ряда', () => {
    expect(visibleRows(rows, 160, 100, 0)).toEqual([2, 5]);
  });

  it('scrollTop на total — окно пустое, за последним рядом', () => {
    expect(visibleRows(rows, 260, 100, 0)).toEqual([5, 5]);
  });

  it('отрицательный scrollTop (отскок прокрутки) — окно от первого ряда', () => {
    expect(visibleRows(rows, -20, 60, 0)).toEqual([0, 2]);
  });

  it('пустая лента — пустое окно', () => {
    expect(visibleRows([], 0, 400, 400)).toEqual([0, 0]);
  });
});

describe('activeSection', () => {
  const { sectionTops } = buildStickerLayout(SAMPLE, 336);

  it('в начале ленты — первый раздел', () => {
    expect(activeSection(sectionTops, 0)).toBe('custom');
  });

  it('scrollTop ровно на верхе раздела — этот раздел', () => {
    expect(activeSection(sectionTops, 164)).toBe('tg:empty');
  });

  it('выше верха раздела на пиксель и больше — предыдущий раздел', () => {
    expect(activeSection(sectionTops, 163)).toBe('custom');
  });

  it('недолёт меньше пикселя до верха раздела — этот раздел', () => {
    expect(activeSection(sectionTops, 163.5)).toBe('tg:empty');
  });

  it('в конце ленты и дальше — последний раздел', () => {
    expect(activeSection(sectionTops, 260)).toBe('tg:empty');
    expect(activeSection(sectionTops, 10_000)).toBe('tg:empty');
  });

  it('отрицательный scrollTop — первый раздел', () => {
    expect(activeSection(sectionTops, -20)).toBe('custom');
  });

  it('пустая лента — нет раздела', () => {
    expect(activeSection([], 0)).toBeNull();
  });

  it('бинпоиск среди многих разделов', () => {
    const many = buildStickerLayout(
      Array.from({ length: 20 }, (_, index) => {
        return section(`tg:${index}`, 120);
      }),
      336
    );
    const { top } = many.sectionTops[13] || { top: 0 };

    expect(activeSection(many.sectionTops, top + 500)).toBe('tg:13');
    expect(activeSection(many.sectionTops, top - 1)).toBe('tg:12');
  });
});
