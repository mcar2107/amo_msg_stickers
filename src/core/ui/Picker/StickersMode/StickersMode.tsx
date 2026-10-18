import type { FunctionComponent as FC } from 'preact';

import { useCoverBitmaps } from '../PackCover/useCoverBitmaps/useCoverBitmaps';
import type { FavoriteToggle } from '../PickerProvider/useFavorites/useFavorites.types';
import { useFavoritesContext } from '../PickerProvider/useFavorites/useFavoritesContext';
import { cellRemovalTargets, sectionRemovalTargets } from '../removalFocus/removalFocus';
import { SectionTabs } from '../SectionTabs/SectionTabs';
import { StickerFeed } from '../StickerFeed/StickerFeed';
import { useFeedEntry } from '../useFeedEntry/useFeedEntry';
import { RECENT_SECTION_ID } from '../usePickerView/sectionIds';

import type { FeedSticker } from './feedSections/feedSections.types';
import { useFeedSections } from './useFeedSections/useFeedSections';
import { useFeedWindow } from './useFeedWindow/useFeedWindow';
import { useStickerRemovalFocus } from './useStickerRemovalFocus/useStickerRemovalFocus';
import type { StickersModeProps } from './StickersMode.types';

/**
 * Режим «Стикеры»: полоса вкладок разделов над лентой всех разделов — недавних, «Моих стикеров» и
 * паков. Вкладки и лента делят окно ленты: выбранная вкладка — раздел в верху видимой области.
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
  const { scrollRef, layout, ranges, activeId, trackScroll } = useFeedWindow(
    sections,
    isCurrent
  );
  const { toggleFavorite } = useFavoritesContext();
  const bitmaps = useCoverBitmaps(isOpen);
  const expectRemoval = useStickerRemovalFocus(sections, scrollRef, isOpen);
  const feed = sections || [];

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

  const handleFavoriteToggle = (toggle: FavoriteToggle) => {
    const { item, sticker } = toggle;

    void toggleFavorite(item, sticker);
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
