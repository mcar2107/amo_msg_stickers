import type { RefObject } from 'preact';
import { useCallback, useMemo, useRef } from 'preact/hooks';

import type { RemoteGif } from '../../../../db.types';
import { gifCellId, gifKey } from '../../MasonryGrid/gifCellId';
import { cellRemovalTargets, resolveFocusTarget } from '../../removalFocus/removalFocus';
import type { FocusSection, FocusTarget } from '../../removalFocus/removalFocus.types';
import { useRemovalFocus } from '../../useRemovalFocus/useRemovalFocus';
import { RECENT_GIF_SECTION_ID } from '../gifSections/gifSections';

import type { GifRemovalFocus } from './useGifRemovalFocus.types';

/**
 * Фокус после «Убрать из недавних» и «Очистить» в ленте GIF: соседняя недавняя GIF
 * (следующая, иначе предыдущая), а если недавних не осталось или соседки нет в окне ленты —
 * поле поиска, без ключей — кнопка «Открыть настройки».
 *
 * @param recent — недавние GIF, свежие первыми
 * @param isOpen — открыт ли пикер
 * @param searchRef — поле поиска; без ключей его нет
 * @returns ссылка для «Открыть настройки» и запоминание целей перед удалением
 */
export const useGifRemovalFocus = (
  recent: RemoteGif[],
  isOpen: boolean,
  searchRef: RefObject<HTMLInputElement>
): GifRemovalFocus => {
  const settingsRef = useRef<HTMLButtonElement>(null);

  /**
   * В выборе фокуса — только раздел недавних: убрать можно только недавнюю GIF, а вкладок
   * разделов, на которые ушёл бы фокус, у ленты GIF нет.
   */
  const feed = useMemo((): FocusSection[] => {
    return [
      {
        id: RECENT_GIF_SECTION_ID,
        items: recent.map((gif) => {
          return { key: gifKey(gif) };
        }),
      },
    ];
  }, [recent]);

  const focusElement = useCallback(
    (targets: FocusTarget[], nextFeed: FocusSection[]) => {
      const fallback = searchRef.current || settingsRef.current;

      if (!fallback) return null;

      const target = resolveFocusTarget(targets, nextFeed);
      const root = fallback.getRootNode();

      if (
        target?.kind !== 'cell' ||
        !(root instanceof DocumentFragment || root instanceof Document)
      )
        return fallback;

      return root.getElementById(gifCellId(target.sectionId, target.key)) || fallback;
    },
    [searchRef]
  );

  const expectRemoval = useRemovalFocus(feed, isOpen, focusElement);

  const expectGifRemoval = useCallback(
    (gif: RemoteGif) => {
      expectRemoval(cellRemovalTargets(feed, RECENT_GIF_SECTION_ID, gifKey(gif)));
    },
    [expectRemoval, feed]
  );

  const expectRecentClear = useCallback(() => {
    expectRemoval([]);
  }, [expectRemoval]);

  return { settingsRef, expectGifRemoval, expectRecentClear };
};
