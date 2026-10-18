import type { RemoteGif } from '../../../db.types';
import { gifItemCellId } from '../MasonryGrid/gifCellId';
import type { MasonryTile } from '../MasonryGrid/splitColumns/splitColumns.types';
import { cellId } from '../StickerFeed/cellId';
import type { StickerRow } from '../stickerLayout/stickerLayout.types';

import type { CellPosition, KeptScrollInput, KeyedCell } from './keptScrollTop.types';

/**
 * Прокрутка, при которой видимая часть ленты остаётся на месте после смены раскладки.
 *
 * Якорь — первая ячейка прежней раскладки, видимая хотя бы частично и оставшаяся в новой, а не
 * верх раздела: у раздела выдачи GIF своего верха нет, а заголовок трендов появляется внутри
 * него. Ячейки убранного элемента в новой раскладке нет, и якорем становится следующая видимая.
 * Лента в самом начале остаётся в начале — появившийся сверху раздел виден.
 *
 * @param input — ячейки прежней раскладки, верхи новой и прокрутка
 * @returns прокрутка для новой раскладки; общей видимой ячейки нет — прежняя
 */
export const keptScrollTop = (input: KeptScrollInput): number => {
  const { prev, next, scrollTop } = input;

  if (scrollTop === 0) return 0;

  for (const { id, top, height } of prev) {
    if (top + height <= scrollTop) continue;

    const nextTop = next.get(id);

    if (nextTop !== undefined) return scrollTop + nextTop - top;
  }

  return scrollTop;
};

/**
 * Ячейки ленты стикеров по её рядам: у всех ячеек ряда верх и высота ряда.
 *
 * @param rows — ряды раскладки ленты стикеров
 * @returns ячейки в порядке ленты
 */
export const stickerCells = <T extends KeyedCell>(
  rows: StickerRow<T>[]
): CellPosition[] => {
  const cells: CellPosition[] = [];

  for (const { sectionId, top, height, items } of rows) {
    for (const { key } of items) {
      cells.push({ id: cellId(sectionId, key), top, height });
    }
  }

  return cells;
};

/**
 * Ячейки ленты GIF по её плиткам: заголовки и заглушки не ячейки.
 *
 * @param tiles — плитки раскладки ленты GIF
 * @returns ячейки в порядке выдачи
 */
export const gifCells = (tiles: MasonryTile<RemoteGif>[]): CellPosition[] => {
  return tiles.reduce<CellPosition[]>((cells, tile) => {
    if (tile.kind === 'item') {
      const { sectionId, item, top, height } = tile;

      cells.push({ id: gifItemCellId(sectionId, item), top, height });
    }

    return cells;
  }, []);
};

/**
 * Верхи ячеек по id — новая раскладка для `keptScrollTop`.
 *
 * @param cells — ячейки раскладки
 * @returns верх каждой ячейки по её id
 */
export const cellTops = (cells: CellPosition[]): Map<string, number> => {
  const tops = new Map<string, number>();

  for (const { id, top } of cells) tops.set(id, top);

  return tops;
};
