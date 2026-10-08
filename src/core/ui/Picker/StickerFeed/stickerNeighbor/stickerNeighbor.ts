import type { PreviewDirection } from '../../Preview/previewDirection/previewDirection.types';
import type { StickerRow } from '../../stickerLayout/stickerLayout.types';

import type { CellIdOf, StickerNeighbor } from './stickerNeighbor.types';

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
  const cellRows = rows.filter(({ items }) => {
    return items.length > 0;
  });
  let rowIndex = -1;
  let column = -1;

  for (const [index, { sectionId, items }] of cellRows.entries()) {
    column = items.findIndex((item) => {
      return idOf(sectionId, item) === id;
    });

    if (column >= 0) {
      rowIndex = index;
      break;
    }
  }

  const current = cellRows[rowIndex];

  if (!current) return null;

  /**
   * Сосед в ряду `index` на колонке `at`; ряда или колонки нет — края.
   *
   * @param index — номер ряда среди рядов со стикерами
   * @param at — колонка в ряду
   * @returns сосед или `null`
   */
  const pick = (index: number, at: number): StickerNeighbor<T> | null => {
    const row = cellRows[index];
    const item = row?.items[at];

    return row && item !== undefined ? { row, item } : null;
  };

  switch (direction) {
    case 'left': {
      if (column > 0) return pick(rowIndex, column - 1);

      const previous = cellRows[rowIndex - 1];

      return previous ? pick(rowIndex - 1, previous.items.length - 1) : null;
    }

    case 'right': {
      if (column < current.items.length - 1) return pick(rowIndex, column + 1);

      return pick(rowIndex + 1, 0);
    }

    case 'up':

    case 'down': {
      const index = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
      const row = cellRows[index];

      return row ? pick(index, Math.min(column, row.items.length - 1)) : null;
    }

    default: {
      throw new Error(`Неизвестное направление: ${String(direction)}`);
    }
  }
};
