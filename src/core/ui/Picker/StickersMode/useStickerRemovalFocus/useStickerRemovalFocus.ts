import type { RefObject } from 'preact';
import { useCallback } from 'preact/hooks';

import { elementById } from '@ui/elementById';
import type { FocusTarget } from '@ui/removalFocus';
import { resolveFocusTarget } from '@ui/removalFocus';
import { sectionTabId } from '@ui/SectionTabs';
import { cellId } from '@ui/StickerFeed/cellId';
import type { FeedSection } from '@ui/StickersMode/feedSections';
import type { RemovalFocus } from '@ui/useRemovalFocus';
import { useRemovalFocus } from '@ui/useRemovalFocus';

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
 * @param favorites — избранное, из которого собраны разделы: правку избранного фокус ждёт по нему
 * @returns запоминание целей фокуса перед удалением и правкой избранного и их снятие
 */
export const useStickerRemovalFocus = (
  sections: FeedSection[] | null,
  scrollRef: RefObject<HTMLElement>,
  isOpen: boolean,
  favorites: unknown
): RemovalFocus => {
  const focusElement = useCallback(
    (targets: FocusTarget[], feed: FeedSection[]) => {
      const scroller = scrollRef.current;
      const target = resolveFocusTarget(targets, feed);

      if (!target || !scroller) return null;

      return targetElement(scroller, target);
    },
    [scrollRef]
  );

  return useRemovalFocus(sections, isOpen, focusElement, favorites);
};
