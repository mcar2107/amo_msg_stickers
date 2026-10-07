import { describe, expect, it } from 'vitest';

import { HINT_SEEN_KEY, readHintSeen, writeHintSeen } from '../src/core/importHint';
import type { PageStorage } from '../src/core/pageStorage.types';

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

describe('readHintSeen', () => {
  it('ключ — amo-stickers:import-hint-seen', () => {
    expect(HINT_SEEN_KEY).toBe('amo-stickers:import-hint-seen');
  });

  it('нет значения — не видел', () => {
    expect(readHintSeen(memoryStorage().storage)).toBe(false);
  });

  it('признак записан — видел', () => {
    const { storage } = memoryStorage();

    writeHintSeen(storage);

    expect(readHintSeen(storage)).toBe(true);
  });

  it('мусор в ключе — не видел', () => {
    expect(readHintSeen(memoryStorage({ [HINT_SEEN_KEY]: '' }).storage)).toBe(false);
    expect(readHintSeen(memoryStorage({ [HINT_SEEN_KEY]: 'false' }).storage)).toBe(false);
  });

  it('хранилище бросает на чтении — не видел', () => {
    expect(readHintSeen(THROWING_STORAGE)).toBe(false);
  });
});

describe('writeHintSeen', () => {
  it('признак пишется под ключом', () => {
    const { storage, data } = memoryStorage();

    writeHintSeen(storage);

    expect(data.has(HINT_SEEN_KEY)).toBe(true);
  });

  it('хранилище бросает на записи — исключение не выходит наружу', () => {
    expect(() => {
      writeHintSeen(THROWING_STORAGE);
    }).not.toThrow();
  });
});
