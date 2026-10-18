import { describe, expect, it, vi } from 'vitest';

import type { PageStorage } from '../src/core/pageStorage.types';
import { MODE_KEY } from '../src/core/pickerMode';
import { startMode } from '../src/core/ui/Picker/usePickerView/startMode';

/**
 * Хранилище с одним сохранённым значением режима.
 *
 * @param value — значение под ключом режима; `null` — ключа нет
 * @returns хранилище только для чтения
 */
const storedMode = (value: string | null): PageStorage => {
  return {
    getItem: (key) => {
      return key === MODE_KEY ? value : null;
    },
    setItem: () => {},
  };
};

/**
 * Хранилище, которое бросает на чтении и на записи — как `localStorage` под запретом сайта.
 */
const THROWING_STORAGE: PageStorage = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
};

/**
 * @param count — сколько стикеров в библиотеке
 * @returns подсчёт стикеров, который можно проверить на вызов
 */
const countOf = (count: number) => {
  return vi.fn(async () => {
    return count;
  });
};

/**
 * Подсчёт избранных стикеров для случаев, где избранного нет.
 */
const NO_FAVORITES = async () => {
  return 0;
};

describe('startMode', () => {
  it('сохранённый режим открывается без подсчёта стикеров', async () => {
    const count = countOf(0);

    await expect(startMode(storedMode('stickers'), count, NO_FAVORITES)).resolves.toBe(
      'stickers'
    );
    await expect(startMode(storedMode('gifs'), countOf(5), NO_FAVORITES)).resolves.toBe(
      'gifs'
    );
    expect(count).not.toHaveBeenCalled();
  });

  it('без сохранённого режима и без стикеров — «GIF»', async () => {
    await expect(startMode(storedMode(null), countOf(0), NO_FAVORITES)).resolves.toBe(
      'gifs'
    );
  });

  it('без сохранённого режима, но со стикерами — «Стикеры»', async () => {
    await expect(startMode(storedMode(null), countOf(1), NO_FAVORITES)).resolves.toBe(
      'stickers'
    );
  });

  it('мусор в ключе — режим по библиотеке', async () => {
    await expect(startMode(storedMode('recent'), countOf(3), NO_FAVORITES)).resolves.toBe(
      'stickers'
    );
    await expect(startMode(storedMode(''), countOf(0), NO_FAVORITES)).resolves.toBe(
      'gifs'
    );
  });

  it('хранилище бросает — режим по библиотеке', async () => {
    await expect(startMode(THROWING_STORAGE, countOf(2), NO_FAVORITES)).resolves.toBe(
      'stickers'
    );
    await expect(startMode(THROWING_STORAGE, countOf(0), NO_FAVORITES)).resolves.toBe(
      'gifs'
    );
  });

  it('библиотека недоступна — «GIF»', async () => {
    const count = vi.fn(async () => {
      throw new Error('IndexedDB недоступна');
    });

    await expect(startMode(storedMode(null), count, NO_FAVORITES)).resolves.toBe('gifs');
  });

  it('без сохранённого режима, библиотека пуста, но есть избранный стикер — «Стикеры»', async () => {
    await expect(startMode(storedMode(null), countOf(0), countOf(1))).resolves.toBe(
      'stickers'
    );
  });

  it('стикеры в библиотеке — избранное не считается', async () => {
    const favorites = countOf(0);

    await expect(startMode(storedMode(null), countOf(2), favorites)).resolves.toBe(
      'stickers'
    );
    expect(favorites).not.toHaveBeenCalled();
  });

  it('подсчёт библиотеки бросает, избранный стикер есть — «Стикеры»', async () => {
    const count = vi.fn(async () => {
      throw new Error('IndexedDB недоступна');
    });

    await expect(startMode(storedMode(null), count, countOf(1))).resolves.toBe(
      'stickers'
    );
  });

  it('оба подсчёта бросают — «GIF»', async () => {
    const count = vi.fn(async () => {
      throw new Error('IndexedDB недоступна');
    });

    await expect(startMode(storedMode(null), count, count)).resolves.toBe('gifs');
  });
});
