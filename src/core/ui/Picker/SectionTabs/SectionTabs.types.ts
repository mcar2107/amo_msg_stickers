import type { CoverBitmaps } from '@ui/PackCover/coverBitmaps';
import type { FeedSection } from '@ui/StickersMode/feedSections';

export type SectionTabsProps = {
  /**
   * Разделы ленты в порядке показа: по вкладке на каждый.
   */
  sections: FeedSection[];

  /**
   * Раздел, в котором верх видимой области ленты: его вкладка выбрана.
   */
  activeId: string | null;

  /**
   * Кэш битмапов обложек открытого попапа; `null` — попап закрыт.
   */
  bitmaps: CoverBitmaps<ImageBitmap> | null;
};
