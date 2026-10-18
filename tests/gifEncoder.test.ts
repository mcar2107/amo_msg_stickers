import { describe, expect, it } from 'vitest';

import { inspectGif } from '@core/gif';
import { createGifEncoder } from '@core/gifEncoder';

import {
  parseGif,
  SYNTHETIC_HEIGHT,
  SYNTHETIC_WIDTH,
  syntheticFrames,
  TRANSPARENT_CORNER,
} from './helpers';

/**
 * SHA-256 GIF, которые `encodeGif` из `convert.ts` базы прогона (5efdc81) выдавал на
 * `syntheticFrames()`: анимация из всех кадров и каждый кадр отдельно. Кодировщик обязан
 * повторять их байт-в-байт — перенос не должен менять ни палитру, ни дизеринг, ни GCE.
 */
const BASELINE_ANIMATED =
  'fd97dd2eb1dc31ac9106e341147543f64af2445d1ff6103fe50ccb16245de8be';
const BASELINE_SINGLE = [
  'd37a8317b9d7178fb49b8bc3562accabc615ee3eff6944d8a7b1e07947867605',
  '87ba4f941d55bfc2de7484ad3d10ee00803cd49a8f4f2f818f59c38a3998a6f0',
  '1873dd357d6ad01bf5af882e640e4a06c96c171b0c8a743a8765c282b69642da',
  'a94ca011f2109980aff0e5f4c378a670061ba44f26f8983b7c7e802178d18e08',
];

const DISPOSE_RESTORE_BACKGROUND = 2;

/**
 * SHA-256 байтов hex-строкой — Web Crypto, как в браузере: тесты не тянут node-модули.
 *
 * @param bytes — байты GIF
 * @returns хэш в нижнем регистре
 */
const sha = async (bytes: Uint8Array<ArrayBuffer>) => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));

  return Array.from(digest, (byte) => {
    return byte.toString(16).padStart(2, '0');
  }).join('');
};

/**
 * Кодирует кадры `syntheticFrames()` с указанными номерами.
 *
 * @param picks — номера кадров; больше одного — анимация
 * @returns байты GIF
 */
const encode = (picks: number[]) => {
  const frames = syntheticFrames();
  const encoder = createGifEncoder({
    width: SYNTHETIC_WIDTH,
    height: SYNTHETIC_HEIGHT,
    isAnimated: picks.length > 1,
  });

  for (const pick of picks) {
    const { rgba, delayMs } = frames[pick]!;

    encoder.write(rgba, delayMs);
  }

  return encoder.finish();
};

const ALL_FRAMES = syntheticFrames().map((_, i) => {
  return i;
});

describe('createGifEncoder', () => {
  it('повторяет encodeGif базы байт-в-байт', async () => {
    expect(await sha(encode(ALL_FRAMES))).toBe(BASELINE_ANIMATED);
    expect(
      await Promise.all(
        ALL_FRAMES.map((i) => {
          return sha(encode([i]));
        })
      )
    ).toEqual(BASELINE_SINGLE);
  });

  it('однокадровый GIF проходит inspectGif', () => {
    expect(inspectGif(encode([0]))).toEqual({
      width: SYNTHETIC_WIDTH,
      height: SYNTHETIC_HEIGHT,
      frames: 1,
    });
  });

  it('многокадровый GIF проходит inspectGif с тем же числом кадров', () => {
    expect(inspectGif(encode(ALL_FRAMES))).toEqual({
      width: SYNTHETIC_WIDTH,
      height: SYNTHETIC_HEIGHT,
      frames: ALL_FRAMES.length,
    });
  });

  it('задержки кадров совпадают с записанными', () => {
    const { frames } = parseGif(encode(ALL_FRAMES));

    expect(
      frames.map(({ delayMs }) => {
        return delayMs;
      })
    ).toEqual(
      syntheticFrames().map(({ delayMs }) => {
        return delayMs;
      })
    );
  });

  /**
   * Среди кадров есть непрозрачный: без явного disposal gifenc оставил бы ему «не трогать»,
   * и прозрачные области следующего кадра показали бы его пиксели.
   */
  it('у анимации disposal «очистить до фона» на каждом кадре, и на непрозрачном', () => {
    const { frames } = parseGif(encode(ALL_FRAMES));

    expect(
      frames.map(({ disposal }) => {
        return disposal;
      })
    ).toEqual(
      ALL_FRAMES.map(() => {
        return DISPOSE_RESTORE_BACKGROUND;
      })
    );
  });

  it('прозрачный пиксель остаётся прозрачным, непрозрачный — нет', () => {
    const [corner, opaque, striped, empty] = parseGif(encode(ALL_FRAMES)).frames;
    const insideCorner =
      (TRANSPARENT_CORNER - 1) * SYNTHETIC_WIDTH + TRANSPARENT_CORNER - 1;
    const outsideCorner = TRANSPARENT_CORNER * SYNTHETIC_WIDTH + TRANSPARENT_CORNER;

    expect(corner?.transparentIndex).not.toBeNull();
    expect(corner?.indices[0]).toBe(corner?.transparentIndex);
    expect(corner?.indices[insideCorner]).toBe(corner?.transparentIndex);
    expect(corner?.indices[outsideCorner]).not.toBe(corner?.transparentIndex);

    expect(opaque?.transparentIndex).toBeNull();

    /**
     * Первая строка полосатого кадра — альфа ниже порога, вторая — непрозрачная.
     */
    expect(striped?.indices[0]).toBe(striped?.transparentIndex);
    expect(striped?.indices[SYNTHETIC_WIDTH]).not.toBe(striped?.transparentIndex);

    expect(empty?.transparentIndex).not.toBeNull();
    expect(
      empty?.indices.every((index) => {
        return index === empty.transparentIndex;
      })
    ).toBe(true);
  });

  it('byteLength растёт с каждым кадром и сходится с итогом', () => {
    const encoder = createGifEncoder({
      width: SYNTHETIC_WIDTH,
      height: SYNTHETIC_HEIGHT,
      isAnimated: true,
    });
    const lengths = [encoder.byteLength];

    for (const { rgba, delayMs } of syntheticFrames()) {
      encoder.write(rgba, delayMs);
      lengths.push(encoder.byteLength);
    }

    lengths.slice(1).forEach((length, i) => {
      expect(length).toBeGreaterThan(lengths[i] || 0);
    });

    const bytes = encoder.finish();

    expect(bytes.length).toBe(encoder.byteLength);
    expect(bytes.length).toBe((lengths.at(-1) || 0) + 1);
  });
});
