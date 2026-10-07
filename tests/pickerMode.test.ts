import { describe, expect, it } from 'vitest';

import type { PageStorage } from '../src/core/pageStorage.types';
import { MODE_KEY, readMode, writeMode } from '../src/core/pickerMode';

/**
 * Хранилище на объекте — как `localStorage`, без браузера.
 *
 * @param initial — начальные значения ключей
 * @returns хранилище и его содержимое
 */
const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  const storage: PageStorage = {
    getItem: (key) => {
      return data.get(key) || null;
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };

  return { storage, data };
};

/**
 * Хранилище, которое бросает на любом обращении — как `localStorage` под запретом сайта.
 */
const THROWING_STORAGE: PageStorage = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
};

describe('readMode', () => {
  it('ключ — amo-stickers:mode', () => {
    expect(MODE_KEY).toBe('amo-stickers:mode');
  });

  it('сохранённый режим читается', () => {
    expect(readMode(memoryStorage({ [MODE_KEY]: 'gifs' }).storage)).toBe('gifs');
    expect(readMode(memoryStorage({ [MODE_KEY]: 'stickers' }).storage)).toBe('stickers');
  });

  it('нет значения — null', () => {
    expect(readMode(memoryStorage().storage)).toBeNull();
  });

  it('мусор в ключе — null', () => {
    expect(readMode(memoryStorage({ [MODE_KEY]: 'recent' }).storage)).toBeNull();
    expect(readMode(memoryStorage({ [MODE_KEY]: '' }).storage)).toBeNull();
    expect(readMode(memoryStorage({ [MODE_KEY]: '"gifs"' }).storage)).toBeNull();
  });

  it('хранилище бросает на чтении — null', () => {
    expect(readMode(THROWING_STORAGE)).toBeNull();
  });
});

describe('writeMode', () => {
  it('режим пишется под ключом и читается обратно', () => {
    const { storage, data } = memoryStorage();

    writeMode(storage, 'gifs');

    expect(data.get(MODE_KEY)).toBe('gifs');
    expect(readMode(storage)).toBe('gifs');
  });

  it('хранилище бросает на записи — исключение не выходит наружу', () => {
    expect(() => {
      writeMode(THROWING_STORAGE, 'stickers');
    }).not.toThrow();
  });
});
