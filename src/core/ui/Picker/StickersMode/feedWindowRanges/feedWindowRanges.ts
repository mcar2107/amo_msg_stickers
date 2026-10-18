import type { RowRange } from '@ui/stickerLayout';
import { visibleRows } from '@ui/stickerLayout';

import type { FeedWindowRangesOptions } from './feedWindowRanges.types';

/**
 * Ряды ленты, которые лежат в документе: видимая область и запас в её высоту за краем.
 *
 * Пока лента плавно едет к разделу, запас держится только по ходу движения: ряды позади уходят
 * из-под видимой области и больше не понадобятся, а их монтирование и декодирование картинок
 * отнимали бы кадры у доезда. Доехавшая лента снова держит запас с обеих сторон.
 *
 * Перед мгновенным переходом к далёкому разделу в документе лежит ещё и окно точки перехода:
 * его ряды монтируются и декодируются заранее, и лента после перехода заполнена с первого кадра.
 * Окна текущего места и перехода идут по порядку рядов, перекрывающиеся — одним диапазоном.
 *
 * @param options — раскладка, прокрутка, видимая область, цель доезда и точка перехода
 * @returns непересекающиеся диапазоны рядов по возрастанию
 */
export const feedWindowRanges = <T>(options: FeedWindowRangesOptions<T>): RowRange[] => {
  const { rows, scrollTop, viewport, glideTo, jumpTo } = options;

  const windowAt = (top: number): RowRange => {
    const isGoingDown = glideTo !== null && glideTo > top;
    const isGoingUp = glideTo !== null && glideTo < top;
    const above = isGoingDown ? 0 : viewport;
    const below = isGoingUp ? 0 : viewport;

    return visibleRows(rows, top - above, viewport + above + below, 0);
  };

  const current = windowAt(scrollTop);

  if (jumpTo === null) return [current];

  const prepared = windowAt(jumpTo);
  const [first, second] =
    current[0] <= prepared[0] ? [current, prepared] : [prepared, current];

  if (first[1] >= second[0]) return [[first[0], Math.max(first[1], second[1])]];

  return [first, second];
};
