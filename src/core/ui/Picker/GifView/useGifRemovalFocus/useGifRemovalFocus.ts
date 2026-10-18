import type { RefObject } from 'preact';
import { useCallback, useMemo, useRef } from 'preact/hooks';

import { elementById } from '../../elementById/elementById';
import { gifCellId } from '../../MasonryGrid/gifCellId';
import type { GifSection } from '../../MasonryGrid/MasonryGrid.types';
import type { FocusSection, FocusTarget } from '../../removalFocus/removalFocus.types';
import { useRemovalFocus } from '../../useRemovalFocus/useRemovalFocus';

import {
  gifCellTargets,
  gifClearTargets,
  gifFocusCell,
  gifFocusSections,
} from './gifFocus';
import type { GifRemovalFocus } from './useGifRemovalFocus.types';

/**
 * Фокус после правки ленты GIF из меню — «Убрать из недавних», пункта избранного и «Очистить»:
 * та же ячейка, если она осталась в разделе, иначе соседняя ячейка раздела, первая GIF другого из
 * разделов избранного и недавних, а если и её нет или ячейки нет в окне ленты — поле поиска, без
 * ключей — кнопка «Открыть настройки».
 *
 * Цели ждут ленту из новых данных правки — избранного и недавних GIF, — а не любую новую ленту:
 * выдачу перестраивает и подгрузка трендов, и цели, доставшиеся ей, ушли бы до ответа базы.
 *
 * @param sections — показанные разделы ленты сверху вниз
 * @param isOpen — открыт ли пикер
 * @param searchRef — поле поиска; без ключей его нет
 * @param revision — избранное и недавние GIF, из которых собраны разделы; новый объект — они
 *   сменились
 * @returns ссылка для «Открыть настройки» и запоминание целей перед правкой
 */
export const useGifRemovalFocus = (
  sections: GifSection[],
  isOpen: boolean,
  searchRef: RefObject<HTMLInputElement>,
  revision: unknown
): GifRemovalFocus => {
  const settingsRef = useRef<HTMLButtonElement>(null);

  const feed = useMemo(() => {
    return gifFocusSections(sections);
  }, [sections]);

  /**
   * Пустые цели — правка отменена: лента не изменилась, и фокус не переводится.
   */
  const focusElement = useCallback(
    (targets: FocusTarget[], nextFeed: FocusSection[]) => {
      const fallback = searchRef.current || settingsRef.current;

      if (!fallback || !targets.length) return null;

      const cell = gifFocusCell(targets, nextFeed);

      if (!cell) return fallback;

      return elementById(fallback, gifCellId(cell.sectionId, cell.key)) || fallback;
    },
    [searchRef]
  );

  const { expectEdit, cancelExpected } = useRemovalFocus(
    feed,
    isOpen,
    focusElement,
    revision
  );

  const expectCellChange = useCallback(
    (sectionId: string, key: string) => {
      expectEdit(gifCellTargets(feed, sectionId, key));
    },
    [expectEdit, feed]
  );

  const expectRecentClear = useCallback(() => {
    expectEdit(gifClearTargets());
  }, [expectEdit]);

  return { settingsRef, expectCellChange, expectRecentClear, cancelExpected };
};
