import { describe, expect, it } from 'vitest';

import type { RecentRec } from '@core/db.types';
import type { ManifestRecent } from '@core/libraryFile';
import { mergeRecent } from '@core/libraryFile/mergeRecent';

/**
 * @param n — номер стикера
 * @param ts — время отправки
 * @returns недавний стикер файла
 */
const fileSticker = (n: number, ts: number): ManifestRecent => {
  return { kind: 'sticker', id: `tg:s${n}`, ts };
};

/**
 * @param id — id GIF у источника
 * @returns GIF из поиска
 */
const gifOf = (id: string) => {
  return {
    provider: 'giphy' as const,
    id,
    url: `https://media.giphy.com/media/${id}/giphy.gif`,
    previewUrl: `https://media.giphy.com/media/${id}/200w.gif`,
    width: 480,
    height: 270,
  };
};

/**
 * @param id — id GIF у источника
 * @param ts — время отправки
 * @returns недавняя GIF файла
 */
const fileGif = (id: string, ts: number): ManifestRecent => {
  return { kind: 'gif', ts, gif: gifOf(id) };
};

/**
 * @param n — номер стикера
 * @param ts — время отправки
 * @returns недавний стикер библиотеки
 */
const ownSticker = (n: number, ts: number): RecentRec => {
  return { key: `l:tg:s${n}`, ts, item: { kind: 'local', stickerId: `tg:s${n}` } };
};

/**
 * @param id — id GIF у источника
 * @param ts — время отправки
 * @returns недавняя GIF библиотеки
 */
const ownGif = (id: string, ts: number): RecentRec => {
  return { key: `r:giphy:${id}`, ts, item: { kind: 'remote', gif: gifOf(id) } };
};

/**
 * @param count — сколько элементов
 * @param make — элемент по номеру
 * @returns элементы с номерами `0…count-1`
 */
const range = <T>(count: number, make: (n: number) => T) => {
  return Array.from({ length: count }, (_, n) => {
    return make(n);
  });
};

/**
 * @param records — записи недавних
 * @returns их ключи
 */
const keysOf = (records: RecentRec[]) => {
  return records.map(({ key }) => {
    return key;
  });
};

describe('mergeRecent', () => {
  it('элемент, которого нет в недавних, добавляется со временем из файла', () => {
    const incoming = [fileGif('a', 5), fileSticker(1, 7)];

    expect(mergeRecent([ownGif('b', 9)], incoming)).toEqual({
      put: [ownSticker(1, 7), ownGif('a', 5)],
      deleteKeys: [],
      added: [fileSticker(1, 7), fileGif('a', 5)],
    });
  });

  it('повтор с более поздним временем в файле — время из файла, без дубля', () => {
    const result = mergeRecent([ownGif('a', 5), ownGif('b', 3)], [fileGif('a', 10)]);

    expect(result).toEqual({
      put: [ownGif('a', 10)],
      deleteKeys: [],
      added: [fileGif('a', 10)],
    });
  });

  it('повтор с более ранним или тем же временем в файле — ничего не меняется', () => {
    const existing = [ownGif('a', 10), ownSticker(1, 10)];

    expect(mergeRecent(existing, [fileGif('a', 5), fileSticker(1, 10)])).toEqual({
      put: [],
      deleteKeys: [],
      added: [],
    });
  });

  it('30 своих и 30 более ранних из файла — 40: прежние 30 и 10 самых недавних из файла', () => {
    const existing = range(30, (n) => {
      return ownSticker(n, 100 + n);
    });
    const incoming = range(30, (n) => {
      return fileSticker(100 + n, n);
    });
    const { put, deleteKeys, added } = mergeRecent(existing, incoming);

    expect(keysOf(put)).toEqual(
      range(10, (n) => {
        return `l:tg:s${129 - n}`;
      })
    );
    expect(added).toEqual(
      range(10, (n) => {
        return fileSticker(129 - n, 29 - n);
      })
    );
    expect(deleteKeys).toEqual([]);
  });

  it('лимит вытесняет свои самые старые, когда в файле более поздние', () => {
    const existing = range(40, (n) => {
      return ownSticker(n, n);
    });
    const incoming = range(5, (n) => {
      return fileSticker(100 + n, 100 + n);
    });
    const { put, deleteKeys } = mergeRecent(existing, incoming);

    expect(put).toHaveLength(5);
    expect([...deleteKeys].sort()).toEqual(
      range(5, (n) => {
        return `l:tg:s${n}`;
      }).sort()
    );
  });

  it('лимит вытесняет элементы файла, если все свои позже', () => {
    const existing = range(40, (n) => {
      return ownGif(`own${n}`, 100 + n);
    });
    const incoming = range(5, (n) => {
      return fileGif(`file${n}`, n);
    });

    expect(mergeRecent(existing, incoming)).toEqual({
      put: [],
      deleteKeys: [],
      added: [],
    });
  });

  it('повтор в полном списке переписывает запись, а не вытесняет соседа', () => {
    const existing = range(40, (n) => {
      return ownSticker(n, n);
    });
    const { put, deleteKeys } = mergeRecent(existing, [fileSticker(0, 1000)]);

    expect(put).toEqual([ownSticker(0, 1000)]);
    expect(deleteKeys).toEqual([]);
  });

  it('ключ библиотеки, переписанный файлом и вытесненный лимитом, удаляется', () => {
    const existing = range(40, (n) => {
      return ownSticker(n, 10 + n);
    });
    const incoming = [
      ...range(40, (n) => {
        return fileSticker(100 + n, 100 + n);
      }),
      fileSticker(0, 12),
    ];
    const { put, deleteKeys, added } = mergeRecent(existing, incoming);

    expect(keysOf(put)).toEqual(
      range(40, (n) => {
        return `l:tg:s${139 - n}`;
      })
    );
    expect(added).not.toContainEqual(fileSticker(0, 12));
    expect([...deleteKeys].sort()).toEqual(
      range(40, (n) => {
        return `l:tg:s${n}`;
      }).sort()
    );
  });

  it('виды не вытесняют друг друга', () => {
    const existing = range(40, (n) => {
      return ownSticker(n, n);
    });
    const incoming = range(40, (n) => {
      return fileGif(`g${n}`, 1000 + n);
    });
    const { put, deleteKeys, added } = mergeRecent(existing, incoming);

    expect(put).toHaveLength(40);
    expect(added).toHaveLength(40);
    expect(deleteKeys).toEqual([]);
  });
});
