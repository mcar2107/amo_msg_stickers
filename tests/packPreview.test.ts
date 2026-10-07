import { describe, expect, it, vi } from 'vitest';

import type { TgStickerSet } from '../src/core/sources/telegram.types';
import { createPackPreview } from '../src/core/ui/Picker/PickerProvider/packPreview/packPreview';

const SET: TgStickerSet = { name: 'cats', title: 'Котики', stickers: [] };

/**
 * Запрос набора, который отвечает, только когда тест его отпустит.
 *
 * @returns запрос и выдача набора в ответ
 */
const deferredResolve = () => {
  let release = (_set: TgStickerSet) => {};

  const resolve = vi.fn(async () => {
    return new Promise<TgStickerSet>((onResolve) => {
      release = onResolve;
    });
  });

  return {
    resolve,
    release: (set: TgStickerSet) => {
      release(set);
    },
  };
};

describe('createPackPreview', () => {
  it('второй запрос того же имени не уходит', async () => {
    const preview = createPackPreview();
    const resolve = vi.fn(async () => {
      return SET;
    });

    await preview.load('cats', resolve);
    await preview.load('cats', resolve);

    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('превью и импорт одного имени параллельно — один запрос и тот же промис', async () => {
    const preview = createPackPreview();
    const { resolve, release } = deferredResolve();

    const forPreview = preview.load('cats', resolve);
    const forImport = preview.load('cats', resolve);

    expect(forImport).toBe(forPreview);
    release(SET);
    await expect(forImport).resolves.toBe(SET);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith('cats');
  });

  it('разные имена — разные запросы', async () => {
    const preview = createPackPreview();
    const resolve = vi.fn(async (name: string) => {
      return { ...SET, name };
    });

    await preview.load('cats', resolve);
    await preview.load('dogs', resolve);

    expect(resolve.mock.calls).toEqual([['cats'], ['dogs']]);
  });

  it('отклонённый промис удаляется из кэша, повтор делает новый запрос', async () => {
    const preview = createPackPreview();
    const error = new Error('Failed to fetch');
    const resolve = vi
      .fn<(name: string) => Promise<TgStickerSet>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(SET);

    await expect(preview.load('cats', resolve)).rejects.toBe(error);
    await expect(preview.load('cats', resolve)).resolves.toBe(SET);
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('ответ по устаревшему номеру отбрасывается', () => {
    const preview = createPackPreview();
    const first = preview.begin();

    expect(preview.isCurrent(first)).toBe(true);

    const second = preview.begin();

    expect(preview.isCurrent(first)).toBe(false);
    expect(preview.isCurrent(second)).toBe(true);
  });

  it('номера запросов — свои у каждого кэша', () => {
    const one = createPackPreview();
    const other = createPackPreview();
    const request = one.begin();

    other.begin();
    other.begin();

    expect(one.isCurrent(request)).toBe(true);
  });
});
