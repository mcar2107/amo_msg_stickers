import { describe, expect, it, vi } from 'vitest';

import { openFrameSource } from '@core/frameSource';
import { openImageSource } from '@core/frameSourceImage';
import { openTgsSource } from '@core/frameSourceTgs';
import { openVideoSource } from '@core/frameSourceVideo';

vi.mock('@core/frameSourceVideo', () => {
  return { openVideoSource: vi.fn() };
});

vi.mock('@core/frameSourceTgs', () => {
  return { openTgsSource: vi.fn() };
});

vi.mock('@core/frameSourceImage', () => {
  return { openImageSource: vi.fn() };
});

describe('openFrameSource', () => {
  it.each([
    ['video', openVideoSource],
    ['tgs', openTgsSource],
    ['image', openImageSource],
  ] as const)('%s → свой источник с тем же blob и maxSide', async (kind, open) => {
    const blob = new Blob();

    await openFrameSource(blob, kind, 384);
    expect(open).toHaveBeenCalledWith(blob, 384);
  });
});
