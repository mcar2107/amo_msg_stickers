import { useEffect, useState } from 'preact/hooks';

import { createKeptScroll } from '../createKeptScroll/createKeptScroll';
import type { KeptScroll } from '../createKeptScroll/createKeptScroll.types';

/**
 * Удержание места ленты режима на время правки избранного. Закрытие попапа снимает метку: правка,
 * не дошедшая до ленты к закрытию, не сдвигает её при следующем открытии.
 *
 * @param isOpen — попап открыт
 * @returns удержание места ленты, одно на всё время жизни режима
 */
export const useKeptScrollMark = (isOpen: boolean): KeptScroll => {
  const [kept] = useState(createKeptScroll);

  useEffect(() => {
    if (!isOpen) kept.drop();
  }, [isOpen, kept]);

  return kept;
};
