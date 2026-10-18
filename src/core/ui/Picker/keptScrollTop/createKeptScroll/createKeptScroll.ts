import { cellTops, keptScrollTop } from '../keptScrollTop';
import type { CellPosition } from '../keptScrollTop.types';

import type { KeptMark, KeptScroll, ScrollElement } from './createKeptScroll.types';

/**
 * Удержание места ленты без DOM и Preact: метка живёт в замыкании, а не в состоянии, — её смена
 * не перерисовывает ленту.
 *
 * Метка расходуется первой же новой раскладкой: она приходит вслед за правкой, а метка,
 * пережившая её, сдвинула бы ленту на следующей чужой смене — импорте, подгрузке выдачи.
 *
 * @returns удержание места ленты
 */
export const createKeptScroll = (): KeptScroll => {
  let shown: CellPosition[] | null = null;
  let scroller: ScrollElement | null = null;
  let mark: KeptMark | null = null;

  return {
    keep: () => {
      mark = shown && scroller ? { cells: shown, scrollTop: scroller.scrollTop } : null;
    },
    drop: () => {
      mark = null;
    },
    settle: (cells, element) => {
      const pending = mark;

      shown = cells;
      scroller = element;

      if (!pending || pending.cells === cells) return null;

      mark = null;

      return keptScrollTop({
        prev: pending.cells,
        next: cellTops(cells),
        scrollTop: pending.scrollTop,
      });
    },
  };
};
