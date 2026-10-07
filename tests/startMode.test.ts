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

describe('startMode', () => {
  it('сохранённый режим открывается без подсчёта стикеров', async () => {
    const count = countOf(0);

    await expect(startMode(storedMode('stickers'), count)).resolves.toBe('stickers');
    await expect(startMode(storedMode('gifs'), countOf(5))).resolves.toBe('gifs');
    expect(count).not.toHaveBeenCalled();
  });

  it('без сохранённого режима и без стикеров — «GIF»', async () => {
    await expect(startMode(storedMode(null), countOf(0))).resolves.toBe('gifs');
  });

  it('без сохранённого режима, но со стикерами — «Стикеры»', async () => {
    await expect(startMode(storedMode(null), countOf(1))).resolves.toBe('stickers');
  });

  it('мусор в ключе — режим по библиотеке', async () => {
    await expect(startMode(storedMode('recent'), countOf(3))).resolves.toBe('stickers');
    await expect(startMode(storedMode(''), countOf(0))).resolves.toBe('gifs');
  });

  it('хранилище бросает — режим по библиотеке', async () => {
    await expect(startMode(THROWING_STORAGE, countOf(2))).resolves.toBe('stickers');
    await expect(startMode(THROWING_STORAGE, countOf(0))).resolves.toBe('gifs');
  });

  it('библиотека недоступна — «GIF»', async () => {
    const count = vi.fn(async () => {
      throw new Error('IndexedDB недоступна');
    });

    await expect(startMode(storedMode(null), count)).resolves.toBe('gifs');
  });
});
