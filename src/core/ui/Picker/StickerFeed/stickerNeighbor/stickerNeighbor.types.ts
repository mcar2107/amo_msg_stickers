import type { StickerRow } from '@ui/stickerLayout';

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
