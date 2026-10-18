import type { FunctionComponent as FC } from 'preact';
import { useMemo } from 'preact/hooks';

import { stickerCells } from '../keptScrollTop/keptScrollTop';
import { useKeptScroll } from '../keptScrollTop/useKeptScroll/useKeptScroll';
import { useKeptScrollMark } from '../keptScrollTop/useKeptScrollMark/useKeptScrollMark';
import { useCoverBitmaps } from '../PackCover/useCoverBitmaps/useCoverBitmaps';
import type { FavoriteToggle } from '../PickerProvider/useFavorites/useFavorites.types';
import { useFavoritesContext } from '../PickerProvider/useFavorites/useFavoritesContext';
import {
  cellRemovalTargets,
  favoriteToggleTargets,
  sectionRemovalTargets,
} from '../removalFocus/removalFocus';
import { SectionTabs } from '../SectionTabs/SectionTabs';
import { StickerFeed } from '../StickerFeed/StickerFeed';
import { useFeedEntry } from '../useFeedEntry/useFeedEntry';
import { FAVORITE_SECTION_ID, RECENT_SECTION_ID } from '../usePickerView/sectionIds';

import type { FeedSticker } from './feedSections/feedSections.types';
import { useFeedSections } from './useFeedSections/useFeedSections';
import { useFeedWindow } from './useFeedWindow/useFeedWindow';
import { useStickerRemovalFocus } from './useStickerRemovalFocus/useStickerRemovalFocus';
import type { StickersModeProps } from './StickersMode.types';

/**
 * Режим «Стикеры»: полоса вкладок разделов над лентой всех разделов — избранного, недавних, «Моих
 * стикеров» и паков. Вкладки и лента делят окно ленты: выбранная вкладка — раздел в верху
 * видимой области.
 */
export const StickersMode: FC<StickersModeProps> = (props) => {
  const { isOpen } = props;
  const {
    sections,
    isCurrent,
    removeSticker,
    removeRecent,
    removePack,
    clearRecentStickers,
  } = useFeedSections(isOpen);
  const { scrollRef, layout, ranges, activeId, trackScroll, syncScroll } = useFeedWindow(
    sections,
    isCurrent
  );
  const { favorites, toggleFavorite } = useFavoritesContext();
  const bitmaps = useCoverBitmaps(isOpen);
  const { expectRemoval, expectEdit, cancelExpected } = useStickerRemovalFocus(
    sections,
    scrollRef,
    isOpen,
    favorites
  );
  const feed = sections || [];
  const keptScroll = useKeptScrollMark(isOpen, favorites);
  const cells = useMemo(() => {
    return layout ? stickerCells(layout.rows) : null;
  }, [layout]);

  useKeptScroll({ kept: keptScroll, scrollRef, cells, syncScroll });

  useFeedEntry(scrollRef);

  const handleFeedScroll = () => {
    trackScroll();
  };

  const handleCellDelete = (sectionId: string, cell: FeedSticker) => {
    const { key, item } = cell;

    expectRemoval(cellRemovalTargets(feed, sectionId, key));

    if (sectionId === RECENT_SECTION_ID) {
      void removeRecent(item);
    } else {
      void removeSticker(item.stickerId);
    }
  };

  /**
   * Ячейка уходит из своего раздела, когда пункт выбран в «Избранном» (убрать) или в «Недавних»
   * (добавить: избранное там не показывается); ячейка пака остаётся. Цели и метка места ждут
   * ленту из нового избранного: импорт пака или сохранение стикера, перестроившие ленту до ответа
   * базы, их не тратят. Неудачная правка ленту не меняет, и цели и метка снимаются: иначе фокус
   * ушёл бы по ним на следующей правке избранного, а лента сдвинулась бы по устаревшей прокрутке.
   */
  const handleFavoriteToggle = async (toggle: FavoriteToggle) => {
    const { sectionId, cellKey, item, sticker } = toggle;
    const isLeaving =
      sectionId === FAVORITE_SECTION_ID || sectionId === RECENT_SECTION_ID;

    expectEdit(favoriteToggleTargets(feed, sectionId, cellKey, isLeaving));
    keptScroll.keep();

    const isApplied = await toggleFavorite(item, sticker);

    if (isApplied) return;

    cancelExpected();
    keptScroll.drop();
  };

  const handlePackDelete = (packId: string) => {
    expectRemoval(sectionRemovalTargets(feed, packId));
    void removePack(packId);
  };

  const handleRecentClear = () => {
    expectRemoval(sectionRemovalTargets(feed, RECENT_SECTION_ID));
    void clearRecentStickers();
  };

  return (
    <>
      <SectionTabs sections={feed} activeId={activeId} bitmaps={bitmaps} />

      <StickerFeed
        sections={feed}
        layout={layout}
        ranges={ranges}
        activeId={activeId}
        scrollRef={scrollRef}
        onScroll={handleFeedScroll}
        onCellDelete={handleCellDelete}
        onFavoriteToggle={handleFavoriteToggle}
        onPackDelete={handlePackDelete}
        onRecentClear={handleRecentClear}
      />
    </>
  );
};
