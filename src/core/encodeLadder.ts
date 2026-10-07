import type { EncodedPass, EncodeLadderOptions } from './encodeLadder.types';
import {
  MAX_GIF_BYTES,
  pickSide,
  SAMPLE_FRAMES,
  sampleIndices,
  sideLadder,
} from './sidePick';

/**
 * Кодирует стикер в пределах `MAX_GIF_BYTES`. Стартовая сторона выбирается по пробе, если
 * в плане больше `SAMPLE_FRAMES` кадров и ряду есть куда уменьшаться; иначе старт —
 * сторона источника. Готовый GIF тяжелее лимита кодируется заново со следующей меньшей
 * стороной ряда, каждый раз новым проходом по источнику. На последней стороне ряда
 * результат отдаётся, даже если он тяжелее лимита.
 *
 * @param options — число кадров, сторона источника, пробный и полный проходы
 * @returns GIF последнего прохода
 */
export const encodeLadder = async ({
  frameCount,
  side,
  sample,
  encode,
  signal,
}: EncodeLadderOptions): Promise<EncodedPass> => {
  const ladder = sideLadder(side);
  let start = side;

  if (frameCount > SAMPLE_FRAMES && ladder.length > 1) {
    const indices = sampleIndices(frameCount);

    signal?.throwIfAborted();
    start = pickSide(await sample(indices), indices.length, frameCount, side);
  }

  const steps = ladder.slice(ladder.indexOf(start));

  /**
   * Попытка живёт в своей итерации: к следующему проходу GIF прошлого уже не держится,
   * и пик памяти не растёт с числом попыток.
   */
  for (const target of steps.slice(0, -1)) {
    signal?.throwIfAborted();
    const pass = await encode(target);

    if (pass.bytes.byteLength <= MAX_GIF_BYTES) return pass;
  }

  signal?.throwIfAborted();

  return encode(steps.at(-1) || side);
};
