import type { CellPosition } from '@ui/keptScrollTop';
import { cellTops, keptScrollTop } from '@ui/keptScrollTop';

import type {
  KeptMark,
  KeptScrollControl,
  ScrollElement,
} from './createKeptScroll.types';

/**
 * Удержание места ленты без DOM и Preact: метка живёт в замыкании, а не в состоянии, — её смена
 * не перерисовывает ленту.
 *
 * Метка ждёт раскладку самой правки — первую, собранную не из тех данных, что были в момент
 * метки, — и расходуется ею: метка, пережившая правку, сдвинула бы ленту на следующей чужой
 * смене. Раскладка из прежних данных — чужая перестройка между выбором пункта и ответом базы
 * (подгрузка выдачи, импорт): она метку не тратит, а переносит на себя, и правка встаёт от той
 * раскладки, что была на экране перед ней.
 *
 * @returns удержание места ленты
 */
export const createKeptScroll = <R>(): KeptScrollControl<R> => {
  let shown: CellPosition[] | null = null;
  let scroller: ScrollElement | null = null;
  let mark: KeptMark<R> | null = null;

  return {
    keep: (revision) => {
      mark =
        shown && scroller
          ? { cells: shown, scrollTop: scroller.scrollTop, revision }
          : null;
    },
    drop: () => {
      mark = null;
    },
    settle: (cells, element, revision) => {
      const pending = mark;

      shown = cells;
      scroller = element;

      if (!pending) return null;

      if (revision === pending.revision) {
        if (pending.cells !== cells) {
          mark = { cells, scrollTop: element.scrollTop, revision };
        }

        return null;
      }

      mark = null;

      if (pending.cells === cells) return null;

      return keptScrollTop({
        prev: pending.cells,
        next: cellTops(cells),
        scrollTop: pending.scrollTop,
      });
    },
  };
};
