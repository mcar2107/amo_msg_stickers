import type { RefObject } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

/**
 * Есть ли элементу куда прокручиваться: содержимое выше видимой высоты. Пересчитывается при смене размера самого
 * элемента (зона растёт до свободного места тела экрана) и его содержимого (сверка файла меняет список). Скрытая панель
 * (`display: none`) даёт нули — прокручивать нечего.
 *
 * @returns ref прокручиваемого элемента и признак прокрутки
 */
export const useIsScrollable = (): [RefObject<HTMLDivElement>, boolean] => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    const update = () => {
      setIsScrollable(element.scrollHeight > element.clientHeight);
    };

    const observer = new ResizeObserver(update);

    observer.observe(element);
    for (const child of element.children) observer.observe(child);

    return () => {
      observer.disconnect();
    };
  }, []);

  return [elementRef, isScrollable];
};
