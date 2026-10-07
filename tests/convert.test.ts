import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toStickerGif } from '../src/core/convert';
import type { FrameSink } from '../src/core/frameSink.types';
import type { FrameSource } from '../src/core/frameSource.types';

/**
 * Приёмник и источник подменяются: настоящий приёмник тянет код Worker-а из сборки, а
 * источнику нужны декодеры браузера. Проверяется проход конвертации, а не они.
 */
const fakes = vi.hoisted(() => {
  return {
    sinks: [] as FrameSink[],
    source: null as FrameSource | null,
  };
});

vi.mock('../src/core/frameSink', () => {
  return {
    createFrameSink: vi.fn((): FrameSink => {
      const sink: FrameSink = {
        write: vi.fn(async () => {}),
        flush: vi.fn(async () => {}),
        byteLength: 0,
        finish: vi.fn(async () => {
          return new Uint8Array(1);
        }),
        close: vi.fn(),
      };

      fakes.sinks.push(sink);

      return sink;
    }),
  };
});

vi.mock('../src/core/frameSource', () => {
  return {
    openFrameSource: vi.fn(async () => {
      return fakes.source;
    }),
  };
});

const FRAMES = 30;

/**
 * Источник видео из `FRAMES` кадров 256 px: на нём нет пробы, и проход — один.
 *
 * @param onDraw — зовётся на отрисовке кадра с его номером
 * @returns источник кадров
 */
const fakeSource = (onDraw: (index: number) => void): FrameSource => {
  return {
    width: 256,
    height: 256,
    plan: Array.from({ length: FRAMES }, (_, position) => {
      return { position, delayMs: 40 };
    }),
    draw: vi.fn(async (index: number) => {
      onDraw(index);
    }),
    dispose: vi.fn(),
  };
};

beforeEach(() => {
  fakes.sinks.length = 0;
  vi.stubGlobal('document', {
    createElement: () => {
      return {
        width: 0,
        height: 0,
        getContext: () => {
          return {
            getImageData: () => {
              return { data: new Uint8ClampedArray(4) };
            },
          };
        },
      };
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toStickerGif: отмена', () => {
  it('обрыв посреди прохода — кадры дальше не пишутся, приёмник и источник закрыты', async () => {
    const controller = new AbortController();
    const source = fakeSource((index) => {
      if (index === 4) controller.abort();
    });

    fakes.source = source;

    await expect(
      toStickerGif(new Blob(['x'], { type: 'video/webm' }), 'video', {
        signal: controller.signal,
      })
    ).rejects.toHaveProperty('name', 'AbortError');

    const [sink] = fakes.sinks;

    expect(fakes.sinks).toHaveLength(1);
    expect(sink?.write).toHaveBeenCalledTimes(5);
    expect(sink?.finish).not.toHaveBeenCalled();
    expect(sink?.close).toHaveBeenCalledTimes(1);
    expect(source.dispose).toHaveBeenCalledTimes(1);
  });

  it('прерванный signal — источник не открывается', async () => {
    const controller = new AbortController();

    fakes.source = fakeSource(() => {});
    controller.abort();

    await expect(
      toStickerGif(new Blob(['x'], { type: 'video/webm' }), 'video', {
        signal: controller.signal,
      })
    ).rejects.toBe(controller.signal.reason);
    expect(fakes.sinks).toHaveLength(0);
  });

  it('без отмены проход пишет все кадры и закрывает приёмник', async () => {
    fakes.source = fakeSource(() => {});

    await toStickerGif(new Blob(['x'], { type: 'video/webm' }), 'video');

    const [sink] = fakes.sinks;

    expect(sink?.write).toHaveBeenCalledTimes(FRAMES);
    expect(sink?.close).toHaveBeenCalledTimes(1);
  });
});
