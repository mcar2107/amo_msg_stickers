import type { RefObject } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

/**
 * Сообщает высоту элемента при каждой её смене: строка статуса бывает в одну и в несколько
 * строк, и высоту текста не вычислить заранее. Скрытая панель (`display: none`) даёт 0 —
 * отступ под строку статуса снимается вместе с ней.
 *
 * @param onHeightChange — колбэк на новую высоту в пикселях
 * @returns ref измеряемого элемента
 */
export const useHeightReport = (
  onHeightChange: (height: number) => void
): RefObject<HTMLDivElement> => {
  const elementRef = useRef<HTMLDivElement>(null);

  /**
   * Последний колбэк через ref: наблюдатель создаётся один раз и не пересоздаётся на каждый
   * рендер вызывающего компонента.
   */
  const callbackRef = useRef(onHeightChange);

  callbackRef.current = onHeightChange;

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      callbackRef.current(Math.ceil(entry?.contentRect.height || 0));
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return elementRef;
};
