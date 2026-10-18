import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import type { StickerRec } from '@core/db.types';
import type { CoverBitmaps } from '@ui/PackCover/coverBitmaps';
import { coverBitmapKey, coverSize } from '@ui/PackCover/coverBitmaps';

/**
 * Рисует первый кадр стикера на холсте обложки. Кадр декодируется сразу в размер холста: полный
 * кадр стикера держал бы в памяти до 1 МБ на вкладку.
 *
 * Нарисованный стикер не перерисовывается: лента на каждое открытие перечитывает стикеры с новыми
 * блобами, а кадр на холсте тот же. Холст перерисовывается, когда у пака сменилась обложка.
 *
 * @param sticker — стикер-обложка
 * @param side — сторона холста в пикселях
 * @param bitmaps — кэш битмапов открытого попапа; `null` — попап закрыт, рисовать некогда
 * @returns ref холста
 */
export const useCoverCanvas = (
  sticker: StickerRec,
  side: number,
  bitmaps: CoverBitmaps<ImageBitmap> | null
): RefObject<HTMLCanvasElement> => {
  const { id, blob, width, height } = sticker;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawnRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    /**
     * Смена стороны холста стирает его содержимое — тот же стикер рисуется заново, кадром
     * новой стороны.
     */
    const drawnKey = coverBitmapKey(id, side);

    if (!bitmaps || !canvas || drawnRef.current === drawnKey) return;

    let isStale = false;
    const { width: resizeWidth, height: resizeHeight } = coverSize(width, height, side);

    const load = () => {
      return createImageBitmap(blob, {
        resizeWidth,
        resizeHeight,
        resizeQuality: 'high',
      });
    };

    const draw = async () => {
      const bitmap = await bitmaps.get(drawnKey, load);
      const context = canvas.getContext('2d');

      if (isStale || !bitmap || !context) return;

      context.clearRect(0, 0, side, side);
      context.drawImage(bitmap, (side - bitmap.width) / 2, (side - bitmap.height) / 2);
      drawnRef.current = drawnKey;
    };

    void draw();

    return () => {
      isStale = true;
    };
  }, [bitmaps, id, blob, width, height, side]);

  return canvasRef;
};
