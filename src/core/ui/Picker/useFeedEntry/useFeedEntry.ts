import type { RefObject } from 'preact';
import { useEffect } from 'preact/hooks';

import { entryIndex } from '@ui/feedEntry';

import type { TabPress } from './useFeedEntry.types';

/**
 * Элементы ленты в порядке Tab: ячейки и кнопки заголовков.
 */
const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Вход в ленту с клавиатуры — на первый видимый целиком элемент (Shift+Tab — на последний), без
 * прокрутки. Лента держит в документе запас рядов над и под видимой областью, и первый по
 * порядку Tab элемент лежит в запасе: браузер фокусировал бы его и прокручивал ленту к нему.
 *
 * Браузер прокручивает ленту раньше, чем приходит `focusin`, поэтому прокрутка запоминается на
 * нажатии Tab и возвращается. Фокус, пришедший изнутри ленты, и вход без прокрутки (клик,
 * перевод фокуса кодом) не трогаются.
 *
 * @param scrollRef — прокручиваемый элемент ленты
 */
export const useFeedEntry = (scrollRef: RefObject<HTMLElement>): void => {
  useEffect(() => {
    const scroller = scrollRef.current;

    if (!scroller) return;

    const root = scroller.getRootNode();
    let press: TabPress | null = null;

    const handleRootKeyDown = (event: Event) => {
      press =
        event instanceof KeyboardEvent && event.key === 'Tab'
          ? { scrollTop: scroller.scrollTop, isBackward: event.shiftKey }
          : null;
    };

    const handleRootKeyUp = () => {
      press = null;
    };

    const handleScrollerFocusIn = (event: FocusEvent) => {
      const { target, relatedTarget } = event;
      const scrolledTop = scroller.scrollTop;

      if (!press || press.scrollTop === scrolledTop) return;

      if (relatedTarget instanceof Node && scroller.contains(relatedTarget)) return;

      scroller.scrollTop = press.scrollTop;

      const elements = [...scroller.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const viewTop = scroller.getBoundingClientRect().top + scroller.clientTop;
      const view = { top: viewTop, bottom: viewTop + scroller.clientHeight };
      const boxes = elements.map((element) => {
        return element.getBoundingClientRect();
      });
      const entry = elements[entryIndex(boxes, view, press.isBackward)];

      if (!entry) {
        scroller.scrollTop = scrolledTop;

        return;
      }

      if (entry !== target) entry.focus({ preventScroll: true });
    };

    root.addEventListener('keydown', handleRootKeyDown, true);
    root.addEventListener('keyup', handleRootKeyUp, true);
    scroller.addEventListener('focusin', handleScrollerFocusIn);

    return () => {
      root.removeEventListener('keydown', handleRootKeyDown, true);
      root.removeEventListener('keyup', handleRootKeyUp, true);
      scroller.removeEventListener('focusin', handleScrollerFocusIn);
    };
  }, [scrollRef]);
};
