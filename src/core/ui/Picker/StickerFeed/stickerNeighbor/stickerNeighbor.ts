import type { CellIdOf } from '../../cellIdOf/cellIdOf.types';
import type { PreviewDirection } from '../../Preview/previewDirection/previewDirection.types';
import type { StickerRow } from '../../stickerLayout/stickerLayout.types';

import type { StickerNeighbor } from './stickerNeighbor.types';

/**
 * Ближайший ряд со стикерами, идя от `from` с шагом `delta`: заголовки, подсказки пустых
 * разделов и ряд из одной плитки «Создать стикер» перешагиваются.
 *
 * @param rows — ряды раскладки сверху вниз
 * @param from — номер текущего ряда
 * @param delta — `-1` — вверх, `1` — вниз
 * @returns ряд со стикерами или `null`
 */
const nearestCellRow = <T>(
  rows: readonly StickerRow<T>[],
  from: number,
  delta: -1 | 1
): StickerRow<T> | null => {
  for (let index = from + delta; index >= 0 && index < rows.length; index += delta) {
    const row = rows[index];

    if (row && row.items.length > 0) return row;
  }

  return null;
};

/**
 * Сосед в ряду `row` на колонке `at`; колонки нет — края.
 *
 * @param row — ряд соседа; `null` — ряда нет
 * @param at — колонка в ряду
 * @returns сосед или `null`
 */
const pick = <T>(row: StickerRow<T> | null, at: number): StickerNeighbor<T> | null => {
  const item = row?.items[at];

  return row && item !== undefined ? { row, item } : null;
};

/**
 * Соседняя ячейка ленты стикеров по раскладке, а не по DOM: в документе только окно рядов, и
 * порядок его узлов не обязан совпадать с порядком ленты.
 *
 * Участвуют только ряды со стикерами: заголовки, подсказки пустых разделов и ряд из одной плитки
 * «Создать стикер» пропускаются, а плитки нет среди стикеров ряда. Влево и вправо — плоский
 * порядок ленты, в том числе через границу разделов; вверх и вниз — соседний ряд со стикерами,
 * колонка прижимается к его длине: из короткого ряда ниже берётся последняя ячейка.
 *
 * @param rows — ряды раскладки сверху вниз
 * @param id — id кнопки текущей ячейки
 * @param direction — направление шага
 * @param idOf — id кнопки ячейки по разделу и стикеру
 * @returns сосед с его рядом; `null` — край ленты или ячейки нет в раскладке
 */
export const stickerNeighbor = <T>(
  rows: readonly StickerRow<T>[],
  id: string,
  direction: PreviewDirection,
  idOf: CellIdOf<T>
): StickerNeighbor<T> | null => {
  for (const [rowIndex, row] of rows.entries()) {
    const { sectionId, items } = row;
    const column = items.findIndex((item) => {
      return idOf(sectionId, item) === id;
    });

    if (column < 0) continue;

    switch (direction) {
      case 'left': {
        if (column > 0) return pick(row, column - 1);

        const previous = nearestCellRow(rows, rowIndex, -1);

        return previous ? pick(previous, previous.items.length - 1) : null;
      }

      case 'right': {
        if (column < items.length - 1) return pick(row, column + 1);

        return pick(nearestCellRow(rows, rowIndex, 1), 0);
      }

      case 'up':

      case 'down': {
        const next = nearestCellRow(rows, rowIndex, direction === 'up' ? -1 : 1);

        return next ? pick(next, Math.min(column, next.items.length - 1)) : null;
      }

      default: {
        throw new Error(`Неизвестное направление: ${String(direction)}`);
      }
    }
  }

  return null;
};
