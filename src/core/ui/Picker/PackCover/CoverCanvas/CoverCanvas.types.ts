import type { StickerRec } from '@core/db.types';
import type { CoverBitmaps } from '@ui/PackCover/coverBitmaps';

export type CoverCanvasProps = {
  /**
   * Стикер-обложка.
   */
  sticker: StickerRec;

  /**
   * Кэш битмапов обложек открытого попапа; `null` — попап закрыт.
   */
  bitmaps: CoverBitmaps<ImageBitmap> | null;
};
