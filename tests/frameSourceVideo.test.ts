import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EVENT_TIMEOUT_MS } from '@core/frameSourceCommon';
import { openVideoSource, videoPlan } from '@core/frameSourceVideo';

import { fakeCanvasContext } from './helpers';
import { FakeVideo } from './helpers';

const BLOB_URL = 'blob:video';

describe('videoPlan', () => {
  it('3 с → 75 кадров по 40 мс от нуля', () => {
    const plan = videoPlan(3);

    expect(plan).toHaveLength(75);
    expect(plan[0]).toEqual({ position: 0, delayMs: 40 });
    expect(plan.at(-1)?.position).toBeCloseTo(2.96);
    expect(
      plan.every(({ delayMs }) => {
        return delayMs === 40;
      })
    ).toBe(true);
  });

  it('длинное видео обрезается до 4 с и 100 кадров', () => {
    const plan = videoPlan(10);

    expect(plan).toHaveLength(100);
    expect(plan.at(-1)?.position).toBeCloseTo(3.96);
  });

  it('при низком fps длину плана задаёт предел 4 с, а не 100 кадров', () => {
    const plan = videoPlan(100, 5);

    expect(plan).toHaveLength(20);
    expect(plan.at(-1)?.position).toBeCloseTo(3.8);
  });

  it('граница длительности не добавляет лишнего кадра', () => {
    expect(videoPlan(0.4)).toHaveLength(10);
    expect(videoPlan(2.96)).toHaveLength(74);
    expect(videoPlan(2.961)).toHaveLength(75);
  });

  it('неизвестная длительность: Infinity → 4 с, NaN и 0 → 1 с', () => {
    expect(videoPlan(Number.POSITIVE_INFINITY)).toHaveLength(100);
    expect(videoPlan(Number.NaN)).toHaveLength(25);
    expect(videoPlan(0)).toHaveLength(25);
  });

  it('высокий fps упирается в 100 кадров', () => {
    const plan = videoPlan(4, 50);

    expect(plan).toHaveLength(100);
    expect(plan[1]).toEqual({ position: 0.02, delayMs: 20 });
  });
});

describe('openVideoSource', () => {
  let video: FakeVideo;
  let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    video = new FakeVideo();
    revokeObjectURL = vi.fn<(url: string) => void>();
    vi.stubGlobal('document', {
      createElement: () => {
        return video;
      },
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(BLOB_URL);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURL);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * Проверяет, что `<video>` отпустил данные файла.
   */
  const expectDisposed = () => {
    expect(video.src).toBe('');
    expect(video.loads).toBe(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
  };

  it('вписывает размер в maxSide и строит план по длительности', async () => {
    const opening = openVideoSource(new Blob(), 512);

    Object.assign(video, { duration: 3, videoWidth: 1024, videoHeight: 780 });
    video.dispatchEvent(new Event('loadeddata'));
    const source = await opening;

    expect(video.src).toBe(BLOB_URL);
    expect(video.muted).toBe(true);
    expect([source.width, source.height]).toEqual([512, 390]);
    expect(source.plan).toHaveLength(75);
    expect(video.seeks).toEqual([]);
  });

  it('duration=Infinity дотягивается seek-ом в конец', async () => {
    video.onSeek = () => {
      video.duration = 3;
    };

    const opening = openVideoSource(new Blob(), 512);

    Object.assign(video, {
      duration: Number.POSITIVE_INFINITY,
      videoWidth: 512,
      videoHeight: 512,
    });
    video.dispatchEvent(new Event('loadeddata'));
    const source = await opening;

    expect(video.seeks).toHaveLength(1);
    expect(video.seeks[0]).toBeGreaterThan(3);
    expect(source.plan).toHaveLength(75);
  });

  it('draw делает seek на позицию кадра и рисует видео в заданный размер', async () => {
    const opening = openVideoSource(new Blob(), 512);

    Object.assign(video, { duration: 1, videoWidth: 512, videoHeight: 512 });
    video.dispatchEvent(new Event('loadeddata'));
    const source = await opening;
    const ctx = fakeCanvasContext();

    await source.draw(5, ctx, 256, 256);
    expect(video.seeks).toEqual([0.2]);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 256, 256);
    expect(ctx.drawImage).toHaveBeenCalledWith(video, 0, 0, 256, 256);
  });

  it('draw за пределами плана — ошибка', async () => {
    const opening = openVideoSource(new Blob(), 512);

    Object.assign(video, { duration: 1, videoWidth: 512, videoHeight: 512 });
    video.dispatchEvent(new Event('loadeddata'));
    const source = await opening;
    const ctx = fakeCanvasContext();

    await expect(source.draw(25, ctx, 256, 256)).rejects.toThrow(RangeError);
  });

  it('dispose отпускает данные файла', async () => {
    const opening = openVideoSource(new Blob(), 512);

    Object.assign(video, { duration: 1, videoWidth: 512, videoHeight: 512 });
    video.dispatchEvent(new Event('loadeddata'));
    const source = await opening;

    source.dispose();
    expectDisposed();
  });

  it('ошибка декодирования до loadeddata — ошибка сразу и видео освобождено', async () => {
    vi.useFakeTimers();
    const opening = openVideoSource(new Blob(), 512);

    video.dispatchEvent(new Event('error'));
    await expect(opening).rejects.toThrow('loadeddata');
    expectDisposed();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('таймаут loadeddata — ошибка и видео освобождено', async () => {
    vi.useFakeTimers();
    const opening = openVideoSource(new Blob(), 512);
    const assertion = expect(opening).rejects.toThrow(
      'Видео не ответило вовремя (loadeddata)'
    );

    await vi.advanceTimersByTimeAsync(EVENT_TIMEOUT_MS);
    await assertion;
    expectDisposed();
  });
});
