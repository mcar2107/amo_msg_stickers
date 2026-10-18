import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMainThreadSink } from '@core/frameSinkMain';
import { createGifEncoder } from '@core/gifEncoder';

import { solidFrame } from './helpers';

const SIZE = 4;

const OPTIONS = { width: SIZE, height: SIZE, isAnimated: true };

describe('createMainThreadSink', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('уступает поток после кадра: write ждёт таймер', async () => {
    vi.useFakeTimers();
    const sink = createMainThreadSink(OPTIONS);
    const onWritten = vi.fn();

    const written = sink.write(solidFrame(SIZE, 10), 40).then(onWritten);

    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(1);
    expect(onWritten).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    await written;
    expect(onWritten).toHaveBeenCalledOnce();
  });

  it('кодирует тем же кодировщиком: байты и вес совпадают', async () => {
    const sink = createMainThreadSink(OPTIONS);
    const encoder = createGifEncoder(OPTIONS);

    for (const [index, value] of [10, 200].entries()) {
      await sink.write(solidFrame(SIZE, value), 40 + index);
      encoder.write(solidFrame(SIZE, value), 40 + index);
    }

    expect(sink.byteLength).toBe(encoder.byteLength);
    expect(await sink.finish()).toEqual(encoder.finish());
  });

  it('после flush вес учитывает все записанные кадры', async () => {
    const sink = createMainThreadSink(OPTIONS);
    const encoder = createGifEncoder(OPTIONS);

    for (const value of [10, 200, 90]) {
      await sink.write(solidFrame(SIZE, value), 40);
      encoder.write(solidFrame(SIZE, value), 40);
    }

    await sink.flush();

    expect(sink.byteLength).toBe(encoder.byteLength);
  });
});
