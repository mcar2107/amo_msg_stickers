import type { CoverBitmaps } from '../../PackCover/coverBitmaps/coverBitmaps.types';
import type { FeedSection } from '../../StickersMode/feedSections/feedSections.types';

export type TabIconProps = {
  /**
   * Раздел вкладки.
   */
  section: FeedSection;

  /**
   * Кэш битмапов обложек открытого попапа; `null` — попап закрыт.
   */
  bitmaps: CoverBitmaps<ImageBitmap> | null;
};
