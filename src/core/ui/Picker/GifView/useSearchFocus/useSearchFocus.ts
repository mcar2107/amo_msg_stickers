import { useEffect, useRef } from 'preact/hooks';

import { usePicker } from '@ui/PickerProvider';
import { usePickerView } from '@ui/usePickerView';

import { shouldFocusSearch } from './shouldFocusSearch';

/**
 * Фокус в поле поиска, когда режим «GIF» становится виден: при открытии кликом и при
 * переключении в режим кликом — GIF ищут сразу, без лишнего клика по полю. Режим, в котором
 * попап открылся сам (сохранённый с прошлого раза), фокус при открытии наведением не забирает.
 *
 * Попап живёт в shadow root, поэтому фокус внутри него — непустой `activeElement` корня
 * поля, а не документа: для документа фокус в shadow root — это его хост.
 *
 * @param isOpen — открыт ли пикер
 * @returns ссылка для поля поиска
 */
export const useSearchFocus = (isOpen: boolean) => {
  const { openedBy } = usePicker();
  const { mode } = usePickerView();
  const inputRef = useRef<HTMLInputElement>(null);
  const isVisible = isOpen && mode === 'gifs';

  useEffect(() => {
    const input = inputRef.current;

    if (!isVisible || !input) return;

    const root = input.getRootNode();
    const hasFocusInside = root instanceof ShadowRoot && Boolean(root.activeElement);

    if (shouldFocusSearch(openedBy, hasFocusInside)) input.focus();
  }, [isVisible, openedBy]);

  return inputRef;
};
