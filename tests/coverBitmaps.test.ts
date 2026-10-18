import { describe, expect, it, vi } from 'vitest';

import {
  coverBitmapKey,
  coverSize,
  createCoverBitmaps,
} from '@ui/PackCover/coverBitmaps';

/**
 * Поддельный битмап: считает закрытия.
 *
 * @param name — метка для сравнения
 * @returns битмап с `close`
 */
const fakeBitmap = (name: string) => {
  return { name, close: vi.fn() };
};

/**
 * Промис с ручным завершением — декодирование, которое ещё идёт.
 *
 * @returns промис и его `resolve`
 */
const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};

  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

describe('createCoverBitmaps', () => {
  it('один id декодируется один раз', async () => {
    const cache = createCoverBitmaps<ReturnType<typeof fakeBitmap>>();
    const bitmap = fakeBitmap('a');
    const load = vi.fn(async () => {
      return bitmap;
    });

    const first = await cache.get('a', load);
    const second = await cache.get('a', load);

    expect(load).toHaveBeenCalledTimes(1);
    expect(first).toBe(bitmap);
    expect(second).toBe(bitmap);
  });

  it('close закрывает все декодированные битмапы', async () => {
    const cache = createCoverBitmaps<ReturnType<typeof fakeBitmap>>();
    const a = fakeBitmap('a');
    const b = fakeBitmap('b');

    await cache.get('a', async () => {
      return a;
    });
    await cache.get('b', async () => {
      return b;
    });
    cache.close();

    expect(a.close).toHaveBeenCalledTimes(1);
    expect(b.close).toHaveBeenCalledTimes(1);
  });

  it('декодирование, завершённое после close, закрывает битмап и отдаёт null', async () => {
    const cache = createCoverBitmaps<ReturnType<typeof fakeBitmap>>();
    const bitmap = fakeBitmap('a');
    const { promise, resolve } = deferred<ReturnType<typeof fakeBitmap>>();
    const pending = cache.get('a', () => {
      return promise;
    });

    cache.close();
    resolve(bitmap);

    expect(await pending).toBeNull();
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it('сбой декодирования — null, следующий запрос декодирует заново', async () => {
    const cache = createCoverBitmaps<ReturnType<typeof fakeBitmap>>();
    const bitmap = fakeBitmap('a');
    const load = vi
      .fn<() => Promise<ReturnType<typeof fakeBitmap>>>()
      .mockRejectedValueOnce(new Error('broken'))
      .mockResolvedValueOnce(bitmap);

    expect(await cache.get('a', load)).toBeNull();
    expect(await cache.get('a', load)).toBe(bitmap);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('coverBitmapKey', () => {
  it('различает стороны холста одного стикера и разные стикеры', () => {
    expect(coverBitmapKey('a', 26)).not.toBe(coverBitmapKey('a', 52));
    expect(coverBitmapKey('a', 26)).not.toBe(coverBitmapKey('b', 26));
    expect(coverBitmapKey('a', 26)).toBe(coverBitmapKey('a', 26));
  });

  it('холст другой стороны получает свой кадр, той же — кадр из кэша', async () => {
    const cache = createCoverBitmaps<ReturnType<typeof fakeBitmap>>();
    const retina = fakeBitmap('52');
    const plain = fakeBitmap('26');
    const load = vi
      .fn<() => Promise<ReturnType<typeof fakeBitmap>>>()
      .mockResolvedValueOnce(retina)
      .mockResolvedValueOnce(plain);

    expect(await cache.get(coverBitmapKey('a', 52), load)).toBe(retina);
    expect(await cache.get(coverBitmapKey('a', 26), load)).toBe(plain);
    expect(await cache.get(coverBitmapKey('a', 26), load)).toBe(plain);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('coverSize', () => {
  it('квадрат вписывается целиком', () => {
    expect(coverSize(512, 512, 52)).toEqual({ width: 52, height: 52 });
  });

  it('широкий стикер — по ширине, высота пропорционально', () => {
    expect(coverSize(512, 256, 52)).toEqual({ width: 52, height: 26 });
  });

  it('высокий стикер — по высоте', () => {
    expect(coverSize(100, 400, 52)).toEqual({ width: 13, height: 52 });
  });

  it('сторона не меньше пикселя и без неизвестных размеров', () => {
    expect(coverSize(1000, 1, 52)).toEqual({ width: 52, height: 1 });
    expect(coverSize(0, 0, 52)).toEqual({ width: 52, height: 52 });
  });
});
