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
