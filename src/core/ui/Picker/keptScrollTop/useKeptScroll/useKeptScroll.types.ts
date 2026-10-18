import type { RefObject } from 'preact';

import type { KeptScroll } from '../createKeptScroll/createKeptScroll.types';
import type { CellPosition } from '../keptScrollTop.types';

export type KeptScrollOptions = {
  /**
   * Удержание места ленты от режима.
   */
  kept: KeptScroll;

  /**
   * Прокручиваемый элемент ленты.
   */
  scrollRef: RefObject<HTMLDivElement>;

  /**
   * Ячейки показанной раскладки; `null` — раскладки ещё нет. Новый массив — новая раскладка.
   */
  cells: CellPosition[] | null;

  /**
   * Перечитывает прокрутку ленты сразу после того, как её поставил код.
   */
  syncScroll: () => void;
};
