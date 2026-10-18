import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedImage, FeedImagesElement } from '@ui/StickersMode/decodeFeedImages';
import { decodeFeedImages } from '@ui/StickersMode/decodeFeedImages';

const CEILING_MS = 150;

/**
 * Верх ленты во вьюпорте и её прокрутка: сдвиг вьюпорт → координаты прокрутки — `+50`.
 */
const FEED_TOP = 50;
const SCROLL_TOP = 100;

/**
 * Картинка с `decode`, который тест завершает сам.
 *
 * @param top — верх картинки во вьюпорте
 * @param bottom — низ картинки во вьюпорте
 * @returns картинка, шпион `decode` и завершение декодирования
 */
const fakeImage = (top: number, bottom: number) => {
  let resolve = () => {};

  let reject: (reason: Error) => void = () => {};

  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  const decode = vi.fn(() => {
    return promise;
  });
  const image: FeedImage = {
    decode,
    getBoundingClientRect: () => {
      return { top, bottom };
    },
  };

  return { image, decode, resolve, reject };
};

/**
 * Лента с заданными картинками.
 *
 * @param images — картинки ленты
 * @returns прокручиваемый элемент ленты
 */
const fakeFeed = (images: FeedImage[]): FeedImagesElement => {
  return {
    scrollTop: SCROLL_TOP,
    getBoundingClientRect: () => {
      return { top: FEED_TOP };
    },
    querySelectorAll: () => {
      return images;
    },
  };
};

/**
 * Запускает ожидание полосы `[200, 400)` и отдаёт признак его конца.
 *
 * @param images — картинки ленты
 * @returns признак «ожидание закончилось» на момент вызова
 */
const startDecode = (images: FeedImage[]) => {
  let isSettled = false;

  void decodeFeedImages({
    element: fakeFeed(images),
    top: 200,
    bottom: 400,
    ceilingMs: CEILING_MS,
  }).then(() => {
    isSettled = true;
  });

  return () => {
    return isSettled;
  };
};

describe('decodeFeedImages', () => {
  beforeEach(() => {
    vi.stubGlobal('window', globalThis);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('декодирует только картинки, пересекающие полосу в координатах прокрутки', () => {
    /**
     * В координатах прокрутки: над полосой впритык (150–200), внутри (200–300), у низа (390–450),
     * под полосой впритык (400–470).
     */
    const above = fakeImage(100, 150);
    const inside = fakeImage(150, 250);
    const atBottom = fakeImage(340, 400);
    const below = fakeImage(350, 420);

    startDecode([above.image, inside.image, atBottom.image, below.image]);

    expect(above.decode).not.toHaveBeenCalled();
    expect(inside.decode).toHaveBeenCalledTimes(1);
    expect(atBottom.decode).toHaveBeenCalledTimes(1);
    expect(below.decode).not.toHaveBeenCalled();
  });

  it('ждёт декодирования всех картинок полосы и снимает таймер потолка', async () => {
    const first = fakeImage(150, 250);
    const second = fakeImage(250, 330);
    const isSettled = startDecode([first.image, second.image]);

    first.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(isSettled()).toBe(false);

    second.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(isSettled()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('выходит по потолку, если декодирование висит', async () => {
    const stuck = fakeImage(150, 250);
    const isSettled = startDecode([stuck.image]);

    await vi.advanceTimersByTimeAsync(CEILING_MS - 1);

    expect(isSettled()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);

    expect(isSettled()).toBe(true);
  });

  it('ошибка декодирования не обрывает ожидание остальных картинок', async () => {
    const broken = fakeImage(150, 250);
    const slow = fakeImage(250, 330);
    const isSettled = startDecode([broken.image, slow.image]);

    broken.reject(new Error('EncodingError'));
    await vi.advanceTimersByTimeAsync(0);

    expect(isSettled()).toBe(false);

    slow.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(isSettled()).toBe(true);
  });
});
