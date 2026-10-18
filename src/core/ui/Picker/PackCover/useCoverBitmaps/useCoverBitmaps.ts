import { useEffect, useMemo } from 'preact/hooks';

import type { CoverBitmaps } from '@ui/PackCover/coverBitmaps';
import { createCoverBitmaps } from '@ui/PackCover/coverBitmaps';

/**
 * Кэш битмапов обложек на одно открытие попапа. Закрытие попапа закрывает все битмапы: закрытый
 * попап остаётся смонтированным до конца жизни страницы, и без этого декодированные кадры
 * обложек висели бы в памяти. Нарисованная обложка остаётся на холсте и без битмапа.
 *
 * @param isOpen — открыт ли попап
 * @returns кэш текущего открытия; `null` — попап закрыт
 */
export const useCoverBitmaps = (isOpen: boolean): CoverBitmaps<ImageBitmap> | null => {
  const bitmaps = useMemo(() => {
    return isOpen ? createCoverBitmaps<ImageBitmap>() : null;
  }, [isOpen]);

  useEffect(() => {
    return () => {
      bitmaps?.close();
    };
  }, [bitmaps]);

  return bitmaps;
};
