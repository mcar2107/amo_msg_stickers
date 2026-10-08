import type { RefObject } from 'preact';
import { useCallback } from 'preact/hooks';

import { elementById } from '../../elementById/elementById';
import { resolveFocusTarget } from '../../removalFocus/removalFocus';
import type { FocusTarget } from '../../removalFocus/removalFocus.types';
import { sectionTabId } from '../../SectionTabs/sectionTabIds';
import { cellId } from '../../StickerFeed/cellId';
import { useRemovalFocus } from '../../useRemovalFocus/useRemovalFocus';
import type { ExpectRemoval } from '../../useRemovalFocus/useRemovalFocus.types';
import type { FeedSection } from '../feedSections/feedSections.types';

/**
 * Элемент цели в shadow root пикера. Ячейка могла не попасть в окно ленты — тогда фокус
 * уходит на вкладку её раздела: полоса вкладок в документе целиком.
 *
 * @param scroller — прокручиваемый элемент ленты: цель ищется в его корне
 * @param target — цель фокуса
 * @returns элемент для фокуса; `null` — его нет в документе
 */
const targetElement = (
  scroller: HTMLElement,
  target: FocusTarget
): HTMLElement | null => {
  const { kind, sectionId } = target;
  const tab = elementById(scroller, sectionTabId(sectionId));

  switch (kind) {
    case 'cell': {
      return elementById(scroller, cellId(sectionId, target.key)) || tab;
    }

    case 'tab': {
      return tab;
    }

    default: {
      const unknownKind: never = kind;

      throw new Error(`Unknown focus target: ${String(unknownKind)}`);
    }
  }
};

/**
 * Фокус после удаления в ленте стикеров: соседняя ячейка раздела, иначе вкладка раздела или
 * соседнего раздела — по целям `removalFocus/`.
 *
 * @param sections — разделы ленты; `null` — библиотека ещё не прочитана
 * @param scrollRef — прокручиваемый элемент ленты: от него ищется shadow root пикера
 * @param isOpen — открыт ли пикер
 * @returns запоминание целей фокуса перед удалением
 */
export const useStickerRemovalFocus = (
  sections: FeedSection[] | null,
  scrollRef: RefObject<HTMLElement>,
  isOpen: boolean
): ExpectRemoval => {
  const focusElement = useCallback(
    (targets: FocusTarget[], feed: FeedSection[]) => {
      const scroller = scrollRef.current;
      const target = resolveFocusTarget(targets, feed);

      if (!target || !scroller) return null;

      return targetElement(scroller, target);
    },
    [scrollRef]
  );

  return useRemovalFocus(sections, isOpen, focusElement);
};
