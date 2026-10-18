import type { CoverBitmaps } from '@ui/PackCover/coverBitmaps';
import type { FeedSection } from '@ui/StickersMode/feedSections';

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
