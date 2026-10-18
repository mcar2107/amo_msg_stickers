import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { frameDelayMs, openImageSource } from '@core/frameSourceImage';
import { setLocale } from '@core/i18n';

import { fakeCanvasContext } from './helpers';
import { FakeImageDecoder, FakeVideoFrame } from './helpers';

const WEBP = new Blob([], { type: 'image/webp' });

describe('frameDelayMs', () => {
  it('переводит микросекунды в мс', () => {
    expect(frameDelayMs(40_000)).toBe(40);
  });

  it('нижняя граница 20 мс', () => {
    expect(frameDelayMs(10_000)).toBe(20);
  });

  it('нет длительности → 100 мс', () => {
    expect(frameDelayMs(null)).toBe(100);
    expect(frameDelayMs(0)).toBe(100);
  });
});

describe('openImageSource: ImageDecoder', () => {
  beforeEach(() => {
    FakeImageDecoder.init = {
      frameCount: 3,
      width: 1024,
      height: 512,
      durations: [40_000, 10_000],
      isSupported: true,
    };
    FakeImageDecoder.instances = [];
    FakeVideoFrame.open = 0;
    vi.stubGlobal('ImageDecoder', FakeImageDecoder);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('план по frameCount и длительностям кадров, размер вписан', async () => {
    const source = await openImageSource(WEBP, 512);

    expect([source.width, source.height]).toEqual([512, 256]);
    expect(source.plan).toEqual([
      { position: 0, delayMs: 40 },
      { position: 1, delayMs: 20 },
      { position: 2, delayMs: 100 },
    ]);
    expect(FakeVideoFrame.open).toBe(0);
  });

  it('не больше 100 кадров', async () => {
    FakeImageDecoder.init.frameCount = 150;
    FakeImageDecoder.init.durations = Array.from({ length: 150 }, () => {
      return 20_000;
    });
    const source = await openImageSource(WEBP, 512);

    expect(source.plan).toHaveLength(100);
  });

  it('длиннее 4 с — кадры, начинающиеся на 4 с и позже, не идут в план', async () => {
    FakeImageDecoder.init.frameCount = 60;
    FakeImageDecoder.init.durations = Array.from({ length: 60 }, () => {
      return 150_000;
    });
    const source = await openImageSource(WEBP, 512);

    /**
     * Кадры по 150 мс начинаются на 0, 150, …, 3900 мс — 27 кадров; 28-й начался бы на 4050.
     */
    expect(source.plan).toHaveLength(27);
    expect(FakeImageDecoder.instances[0]!.decoded).toHaveLength(27);
  });

  it('кадр, начинающийся ровно на 4 с, в план не идёт', async () => {
    FakeImageDecoder.init.frameCount = 60;
    FakeImageDecoder.init.durations = Array.from({ length: 60 }, () => {
      return 100_000;
    });
    const source = await openImageSource(WEBP, 512);

    expect(source.plan).toHaveLength(40);
  });

  it('задержка последнего кадра урезается до 4 с по сумме', async () => {
    FakeImageDecoder.init.frameCount = 36;
    FakeImageDecoder.init.durations = [
      ...Array.from({ length: 35 }, () => {
        return 100_000;
      }),
      2_000_000,
    ];
    const { plan } = await openImageSource(WEBP, 512);
    const totalMs = plan.reduce((sum, { delayMs }) => {
      return sum + delayMs;
    }, 0);

    expect(plan).toHaveLength(36);
    expect(plan.at(-1)!.delayMs).toBe(500);
    expect(totalMs).toBeLessThanOrEqual(4020);
  });

  it('урезанная задержка не меньше 20 мс', async () => {
    FakeImageDecoder.init.frameCount = 2;
    FakeImageDecoder.init.durations = [3_990_000, 100_000];
    const { plan } = await openImageSource(WEBP, 512);

    expect(plan).toEqual([
      { position: 0, delayMs: 3990 },
      { position: 1, delayMs: 20 },
    ]);
  });

  it('один кадр — статичная картинка с задержкой 0', async () => {
    FakeImageDecoder.init.frameCount = 1;
    const source = await openImageSource(new Blob([], { type: 'image/png' }), 512);

    expect(source.plan).toEqual([{ position: 0, delayMs: 0 }]);
  });

  it('draw декодирует кадр плана, рисует и закрывает его', async () => {
    const source = await openImageSource(WEBP, 512);
    const [decoder] = FakeImageDecoder.instances;
    const ctx = fakeCanvasContext();

    decoder!.decoded = [];
    await source.draw(2, ctx, 256, 128);
    expect(decoder!.decoded).toEqual([2]);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 256, 128);
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.any(FakeVideoFrame),
      0,
      0,
      256,
      128
    );
    expect(FakeVideoFrame.open).toBe(0);
    await expect(source.draw(3, ctx, 256, 128)).rejects.toThrow(RangeError);
  });

  it.each([
    ['ru', 'Не удалось прочитать кадры картинки'],
    ['en', "Couldn't read the image frames"],
  ] as const)('без дорожки — ошибка на %s, декодер закрыт', async (locale, message) => {
    setLocale(locale);
    FakeImageDecoder.init.isTrackMissing = true;

    try {
      await expect(openImageSource(WEBP, 512)).rejects.toThrow(message);
      expect(FakeImageDecoder.instances[0]!.isClosed).toBe(true);
    } finally {
      setLocale('ru');
    }
  });

  it('dispose закрывает декодер', async () => {
    const source = await openImageSource(WEBP, 512);

    source.dispose();
    expect(FakeImageDecoder.instances[0]!.isClosed).toBe(true);
  });

  it('неподдерживаемый тип идёт в createImageBitmap', async () => {
    FakeImageDecoder.init.isSupported = false;
    const close = vi.fn();

    vi.stubGlobal('createImageBitmap', async () => {
      return { width: 100, height: 50, close };
    });
    const source = await openImageSource(WEBP, 512);

    expect(FakeImageDecoder.instances).toHaveLength(0);
    expect(source.plan).toEqual([{ position: 0, delayMs: 0 }]);
    expect([source.width, source.height]).toEqual([100, 50]);
  });
});

describe('openImageSource: createImageBitmap', () => {
  const close = vi.fn();
  const bitmap = { width: 2000, height: 1000, close };

  beforeEach(() => {
    close.mockClear();
    vi.stubGlobal('createImageBitmap', async () => {
      return bitmap;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('без ImageDecoder — один кадр с задержкой 0', async () => {
    const source = await openImageSource(new Blob([], { type: 'image/png' }), 512);

    expect([source.width, source.height]).toEqual([512, 256]);
    expect(source.plan).toEqual([{ position: 0, delayMs: 0 }]);
  });

  it('битмап живёт до dispose и рисуется в заданный размер', async () => {
    const source = await openImageSource(new Blob([]), 512);
    const ctx = fakeCanvasContext();

    await source.draw(0, ctx, 256, 128);
    await source.draw(0, ctx, 256, 128);
    expect(ctx.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 256, 128);
    expect(close).not.toHaveBeenCalled();
    source.dispose();
    expect(close).toHaveBeenCalledOnce();
  });
});
