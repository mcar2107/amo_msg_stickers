import { describe, expect, it } from 'vitest';

import {
  favoriteRecord,
  favoritesNewestFirst,
  groupStickers,
  itemKey,
  recentKindOf,
  recentOfKind,
  recentOverflow,
  transactionError,
} from '../src/core/db';
import type { FavoriteRec, RecentRec, StickerRec } from '../src/core/db.types';
import { LocalizedError, t } from '../src/core/i18n/translate';

/**
 * Запись недавнего стикера из пака.
 *
 * @param stickerId — идентификатор стикера
 * @param ts — время отправки
 * @returns запись недавних
 */
const sticker = (stickerId: string, ts: number): RecentRec => {
  return { key: `l:${stickerId}`, ts, item: { kind: 'local', stickerId } };
};

/**
 * Запись недавней GIF из поиска.
 *
 * @param id — идентификатор GIF у провайдера
 * @param ts — время отправки
 * @returns запись недавних
 */
const gif = (id: string, ts: number): RecentRec => {
  return {
    key: `r:giphy:${id}`,
    ts,
    item: {
      kind: 'remote',
      gif: {
        provider: 'giphy',
        id,
        title: id,
        url: `https://media.giphy.com/${id}.gif`,
        previewUrl: `https://media.giphy.com/${id}_s.gif`,
        width: 100,
        height: 100,
      },
    },
  };
};

/**
 * Ключи записей — порядок и состав так проще сравнивать.
 *
 * @param records — записи недавних
 * @returns ключи в том же порядке
 */
const keys = (records: RecentRec[]): string[] => {
  return records.map(({ key }) => {
    return key;
  });
};

/**
 * Записи одного вида с отметками времени от `from` вниз.
 *
 * @param make — фабрика записи
 * @param count — сколько записей
 * @param from — время самой новой записи
 * @returns записи от новых к старым
 */
const series = (
  make: (id: string, ts: number) => RecentRec,
  count: number,
  from: number
): RecentRec[] => {
  return Array.from({ length: count }, (_, index) => {
    return make(`${from - index}`, from - index);
  });
};

describe('recentKindOf', () => {
  it('стикер из пака — вид «стикер», GIF из поиска — вид «GIF»', () => {
    expect(recentKindOf(sticker('a', 1).item)).toBe('sticker');
    expect(recentKindOf(gif('a', 1).item)).toBe('gif');
  });
});

describe('recentOfKind', () => {
  /**
   * Недавние прежней версии — общий список вперемешку, от новых к старым, как его отдавал `listRecent()`.
   */
  const MIXED: RecentRec[] = [
    gif('g3', 90),
    sticker('s3', 80),
    sticker('s2', 70),
    gif('g2', 60),
    sticker('s1', 50),
    gif('g1', 40),
  ];

  it('смешанные записи прежней версии делятся по видам в прежнем порядке', () => {
    expect(keys(recentOfKind(MIXED, 'sticker'))).toEqual(['l:s3', 'l:s2', 'l:s1']);
    expect(keys(recentOfKind(MIXED, 'gif'))).toEqual([
      'r:giphy:g3',
      'r:giphy:g2',
      'r:giphy:g1',
    ]);
  });

  it('записи в порядке хранилища сортируются от новых к старым', () => {
    const shuffled = [MIXED[5], MIXED[1], MIXED[3], MIXED[2], MIXED[0], MIXED[4]].filter(
      (rec) => {
        return rec !== undefined;
      }
    );

    expect(keys(recentOfKind(shuffled, 'sticker'))).toEqual(['l:s3', 'l:s2', 'l:s1']);
    expect(keys(recentOfKind(shuffled, 'gif'))).toEqual([
      'r:giphy:g3',
      'r:giphy:g2',
      'r:giphy:g1',
    ]);
  });

  it('вида без записей нет — пустой список', () => {
    expect(recentOfKind([sticker('a', 1)], 'gif')).toEqual([]);
  });
});

describe('recentOverflow', () => {
  it('41-й стикер вытесняет самый старый стикер, GIF не трогаются', () => {
    const records = [...series(sticker, 41, 1000), ...series(gif, 40, 500)];

    expect(recentOverflow(records, 'sticker')).toEqual(['l:960']);
    expect(recentOverflow(records, 'gif')).toEqual([]);
  });

  it('переполнение GIF не трогает стикеры, даже если стикеры старше', () => {
    const records = [...series(gif, 42, 1000), ...series(sticker, 40, 100)];

    expect(recentOverflow(records, 'gif')).toEqual(['r:giphy:960', 'r:giphy:959']);
    expect(recentOverflow(records, 'sticker')).toEqual([]);
  });

  it('вместе больше 40, но каждого вида не больше 40 — ничего не удаляется', () => {
    const records = [...series(sticker, 40, 1000), ...series(gif, 40, 2000)];

    expect(recentOverflow(records, 'sticker')).toEqual([]);
    expect(recentOverflow(records, 'gif')).toEqual([]);
  });
});

/**
 * Запись стикера пака.
 *
 * @param id — идентификатор стикера
 * @param packId — пак
 * @param createdAt — время добавления
 * @returns запись стикера
 */
const stickerRec = (id: string, packId: string, createdAt: number): StickerRec => {
  return { id, packId, blob: new Blob(), width: 512, height: 512, createdAt };
};

describe('groupStickers', () => {
  it('стикеры делятся по пакам, внутри пака — по времени добавления', () => {
    const groups = groupStickers([
      stickerRec('b2', 'tg:b', 20),
      stickerRec('c1', 'custom', 30),
      stickerRec('a3', 'tg:a', 9),
      stickerRec('b1', 'tg:b', 10),
      stickerRec('a1', 'tg:a', 1),
      stickerRec('a2', 'tg:a', 5),
    ]);

    const ids = Object.fromEntries(
      [...groups].map(([packId, stickers]) => {
        return [
          packId,
          stickers.map(({ id }) => {
            return id;
          }),
        ];
      })
    );

    expect(ids).toEqual({
      custom: ['c1'],
      'tg:a': ['a1', 'a2', 'a3'],
      'tg:b': ['b1', 'b2'],
    });
  });

  it('пустая библиотека — пустая группировка, пака без стикеров в ней нет', () => {
    expect(groupStickers([]).size).toBe(0);
    expect(groupStickers([stickerRec('a', 'tg:a', 1)]).has('custom')).toBe(false);
  });
});

describe('itemKey', () => {
  it('стикер — `l:<id>`, GIF — `r:<источник>:<id>`, как у записей недавних', () => {
    expect(itemKey(sticker('a', 1).item)).toBe('l:a');
    expect(itemKey(gif('g', 1).item)).toBe('r:giphy:g');
  });
});

describe('favoriteRecord', () => {
  it('стикер — со снимком записи и ключом недавних', () => {
    const snapshot = stickerRec('a', 'tg:a', 1);

    expect(favoriteRecord(sticker('a', 1).item, snapshot, 5)).toEqual({
      key: 'l:a',
      ts: 5,
      item: { kind: 'local', stickerId: 'a' },
      sticker: snapshot,
    });
  });

  it('GIF — без снимка, ключ недавних', () => {
    const { item } = gif('g', 1);

    expect(favoriteRecord(item, undefined, 7)).toEqual({ key: 'r:giphy:g', ts: 7, item });
  });

  it('стикер без снимка — ошибка: записи нечем показать стикер удалённого пака', () => {
    expect(() => {
      return favoriteRecord(sticker('a', 1).item, undefined, 1);
    }).toThrow();
  });
});

describe('favoritesNewestFirst', () => {
  it('записи в порядке хранилища — от новых к старым, исходный список не меняется', () => {
    const records: FavoriteRec[] = [
      favoriteRecord(gif('g1', 1).item, undefined, 10),
      favoriteRecord(sticker('s1', 1).item, stickerRec('s1', 'custom', 1), 30),
      favoriteRecord(gif('g2', 1).item, undefined, 20),
    ];

    expect(
      favoritesNewestFirst(records).map(({ key }) => {
        return key;
      })
    ).toEqual(['l:s1', 'r:giphy:g2', 'r:giphy:g1']);
    expect(records[0]?.key).toBe('r:giphy:g1');
  });
});

describe('transactionError', () => {
  it('прерывание без ошибки транзакции — ошибка словаря, а не `null`', () => {
    const error = transactionError(null);

    expect(error).toBeInstanceOf(LocalizedError);
    expect(error.message).toBe(t('error.db.aborted'));
  });

  it('ошибка транзакции отдаётся как есть', () => {
    const cause = new DOMException('Quota exceeded', 'QuotaExceededError');

    expect(transactionError(cause)).toBe(cause);
  });
});
