import type { Pack } from '@core/db.types';
import type { FeedSticker } from '@ui/StickersMode/feedSections';

import type { CoverBitmaps } from './coverBitmaps';

export type PackCoverProps = {
  /**
   * Пак вкладки: из него — стикер-обложка и подпись пака без стикеров.
   */
  pack: Pack;

  /**
   * Стикеры раздела пака в порядке ленты.
   */
  items: FeedSticker[];

  /**
   * Кэш битмапов обложек открытого попапа; `null` — попап закрыт.
   */
  bitmaps: CoverBitmaps<ImageBitmap> | null;
};
