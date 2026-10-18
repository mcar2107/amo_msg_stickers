import type { RefObject } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { useIsScrollable } from '@ui/AddView/FileTransfer/ImportCard/PackList/useIsScrollable';

/**
 * Стоит ли прокручиваемый элемент в порядке Tab: пока есть что прокручивать или пока он сам в фокусе. Без второго
 * условия область, переставшая прокручиваться под фокусом (зона выросла, список укоротился), потеряла бы `tabIndex`,
 * и фокус упал бы в `body`; из порядка Tab она уходит, когда фокус её покинул.
 *
 * @returns ref прокручиваемого элемента и признак места в порядке Tab
 */
export const useScrollTabStop = (): [RefObject<HTMLDivElement>, boolean] => {
  const [elementRef, isScrollable] = useIsScrollable();
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    const markFocused = () => {
      setIsFocused(true);
    };

    const markBlurred = () => {
      setIsFocused(false);
    };

    element.addEventListener('focus', markFocused);
    element.addEventListener('blur', markBlurred);

    return () => {
      element.removeEventListener('focus', markFocused);
      element.removeEventListener('blur', markBlurred);
    };
  }, [elementRef]);

  return [elementRef, isScrollable || isFocused];
};
