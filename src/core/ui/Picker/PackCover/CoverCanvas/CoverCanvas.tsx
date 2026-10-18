import type { FunctionComponent as FC } from 'preact';

import { useCoverCanvas } from '@ui/PackCover/useCoverCanvas';

import type { CoverCanvasProps } from './CoverCanvas.types';

/**
 * Сторона обложки в CSS-пикселях — `size-6.5`.
 */
const COVER_SIDE = 26;

/**
 * Холст обложки: кадр на `<canvas>`, а не `<img>` — картинка GIF анимировалась бы и держала
 * декодер на каждую вкладку. Холст — в пикселях экрана, чтобы обложка не мылилась на Retina.
 */
export const CoverCanvas: FC<CoverCanvasProps> = (props) => {
  const { sticker, bitmaps } = props;
  const side = Math.round(COVER_SIDE * (window.devicePixelRatio || 1));
  const canvasRef = useCoverCanvas(sticker, side, bitmaps);

  return (
    <canvas
      ref={canvasRef}
      width={side}
      height={side}
      aria-hidden="true"
      className="size-6.5"
    />
  );
};
