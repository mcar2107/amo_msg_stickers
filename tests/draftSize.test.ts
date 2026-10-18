import { describe, expect, it } from 'vitest';

import type { StickerDraft } from '@ui/useStickerDraft';
import { draftSize } from '@ui/useStickerDraft';

/**
 * Черновик с GIF заданного веса и сторон.
 *
 * @param bytes — вес GIF в байтах
 * @param width — ширина GIF
 * @param height — высота GIF
 * @returns черновик стикера
 */
const draftOf = (bytes: number, width = 512, height = 384): StickerDraft => {
  return {
    gif: { blob: new Blob([new Uint8Array(bytes)]), width, height },
    caption: '',
    url: 'blob:draft',
  };
};

describe('draftSize', () => {
  it('без черновика — размера нет', () => {
    expect(draftSize(null)).toBeNull();
  });

  it('стороны берёт из GIF', () => {
    expect(draftSize(draftOf(2048, 320, 240))).toMatchObject({ width: 320, height: 240 });
  });

  it('вес округляет до целого КБ', () => {
    expect(draftSize(draftOf(1535))?.kb).toBe(1);
    expect(draftSize(draftOf(1536))?.kb).toBe(2);
    expect(draftSize(draftOf(100))?.kb).toBe(0);
  });
});
