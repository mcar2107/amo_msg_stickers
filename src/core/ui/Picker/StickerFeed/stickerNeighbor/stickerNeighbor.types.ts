import type { StickerRow } from '../../stickerLayout/stickerLayout.types';

/**
 * id кнопки ячейки по разделу и элементу: ключ стикера уникален только в разделе.
 */
export type CellIdOf<T> = (sectionId: string, item: T) => string;

/**
 * Соседняя ячейка ленты стикеров.
 */
export type StickerNeighbor<T> = {
  /**
   * Ряд соседа: раздел ячейки и её геометрия — по ним ищется кнопка и считается прокрутка.
   */
  row: StickerRow<T>;

  /**
   * Стикер соседа.
   */
  item: T;
};
