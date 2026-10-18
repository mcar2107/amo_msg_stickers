import { useLayoutEffect, useState } from 'preact/hooks';

import { createScrollReset } from '@ui/MasonryGrid/scrollReset';
import { useScrollArea } from '@ui/useScrollArea';

import type { GridWindow } from './useGridWindow.types';

/**
 * Размеры и прокрутка ленты GIF для окна плиток.
 *
 * Смена `resetKey` прокручивает ленту к началу: сразу, если она видна, иначе при показе — поверх
 * прокрутки, которую вернула панель режима.
 *
 * @param resetKey — номер сброса выдачи
 * @returns прокручиваемый элемент, его размеры, прокрутка и её учёт
 */
export const useGridWindow = (resetKey: number): GridWindow => {
  const [scrollReset] = useState(createScrollReset);
  const { scrollRef, width, viewport, scrollTop, trackScroll, syncScroll } =
    useScrollArea(scrollReset.apply);

  useLayoutEffect(() => {
    const element = scrollRef.current;

    scrollReset.request();

    if (element && scrollReset.apply(element)) syncScroll();
  }, [resetKey, scrollReset, scrollRef, syncScroll]);

  return { scrollRef, width, viewport, scrollTop, trackScroll, syncScroll };
};
