import { useLayoutEffect } from 'preact/hooks';

import type { KeptScrollOptions } from './useKeptScroll.types';

/**
 * Ставит ленте прокрутку из метки правки, когда показана новая раскладка.
 *
 * Layout-эффект, а не эффект: прокрутка встаёт до отрисовки, и кадр со сдвинутой лентой не
 * виден. Прокрутка перечитывается сразу, а не по событию прокрутки в следующем кадре: окно рядов
 * считается по новой прокрутке до отрисовки, и ряды на месте видимой области не пустеют.
 *
 * @param options — удержание, элемент ленты, ячейки раскладки и перечитывание прокрутки
 */
export const useKeptScroll = (options: KeptScrollOptions): void => {
  const { kept, scrollRef, cells, syncScroll } = options;

  useLayoutEffect(() => {
    const element = scrollRef.current;

    if (!element || !cells) return;

    const top = kept.settle(cells, element);

    if (top === null) return;

    element.scrollTop = top;
    syncScroll();
  }, [kept, scrollRef, cells, syncScroll]);
};
