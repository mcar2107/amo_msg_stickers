import type { MasonryTile } from '../splitColumns/splitColumns.types';

/**
 * Плитка элемента выдачи — без заголовков и заглушек.
 */
export type MasonryItemTile<T> = Extract<
  MasonryTile<T>,
  {
    /**
     * Вид плитки — элемент выдачи.
     */
    kind: 'item';
  }
>;

/**
 * id кнопки ячейки по разделу и элементу: та же GIF стоит и в недавних, и в выдаче.
 */
export type TileIdOf<T> = (sectionId: string, item: T) => string;
