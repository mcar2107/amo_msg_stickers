import { afterEach, describe, expect, it } from 'vitest';

import type {
  FavoriteRec,
  Pack,
  RecentRec,
  StickerRec,
  StickersByPack,
} from '@core/db.types';
import { setLocale } from '@core/i18n';
import type { FeedSection } from '@ui/StickersMode/feedSections';
import { feedSections } from '@ui/StickersMode/feedSections';

/**
 * Пак с заданным id и названием.
 *
 * @param id — id пака
 * @param title — название
 * @returns пак
 */
const pack = (id: string, title: string): Pack => {
  return { id, title, source: id === 'custom' ? 'custom' : 'telegram', createdAt: 0 };
};

/**
 * Стикер пака с эмодзи.
 *
 * @param id — id стикера
 * @param packId — пак
 * @param emoji — эмодзи стикера
 * @returns запись стикера
 */
const sticker = (id: string, packId: string, emoji?: string): StickerRec => {
  return { id, packId, blob: new Blob(), width: 1, height: 1, emoji, createdAt: 0 };
};

/**
 * Запись недавних своего стикера.
 *
 * @param stickerId — id стикера
 * @returns запись недавних
 */
const recent = (stickerId: string): RecentRec => {
  return { key: `l:${stickerId}`, ts: 0, item: { kind: 'local', stickerId } };
};

/**
 * Запись избранного своего стикера со снимком.
 *
 * @param snapshot — снимок записи стикера
 * @param ts — время добавления
 * @returns запись избранного
 */
const favorite = (snapshot: StickerRec, ts = 0): FavoriteRec => {
  return {
    key: `l:${snapshot.id}`,
    ts,
    item: { kind: 'local', stickerId: snapshot.id },
    sticker: snapshot,
  };
};

/**
 * Ключи ячеек раздела.
 *
 * @param section — раздел ленты
 * @returns ключи в порядке показа
 */
const keysOf = (section: FeedSection | undefined): string[] => {
  return (section?.items || []).map(({ key }) => {
    return key;
  });
};

const PACKS = [pack('custom', 'Мои стикеры'), pack('tg:a', 'A'), pack('tg:b', 'B')];

const BY_PACK: StickersByPack = new Map([
  ['tg:a', [sticker('a1', 'tg:a', '😀'), sticker('a2', 'tg:a')]],
  ['tg:b', [sticker('b1', 'tg:b')]],
]);

afterEach(() => {
  setLocale('ru');
});

describe('feedSections', () => {
  it('без недавних лента начинается с «Моих стикеров», паки — в порядке списка паков', () => {
    const sections = feedSections(PACKS, BY_PACK, [], []);

    expect(
      sections.map(({ id, title }) => {
        return [id, title];
      })
    ).toEqual([
      ['custom', 'Мои стикеры'],
      ['tg:a', 'A'],
      ['tg:b', 'B'],
    ]);
  });

  it('пак без стикеров — раздел без ячеек: у «Моих стикеров» плитка без подсказки, у пака — «Пак пуст» без плитки', () => {
    const [custom, packA] = feedSections(PACKS, new Map([['tg:a', []]]), [], []);

    expect(custom?.items).toEqual([]);
    expect(custom?.hasCreateTile).toBe(true);
    expect(custom?.hint).toBe('');
    expect(packA?.items).toEqual([]);
    expect(packA?.hasCreateTile).toBe(false);
    expect(packA?.hint).toBe('Пак пуст');
  });

  it('плитка «Создать стикер» — только у «Моих стикеров», и со стикерами тоже', () => {
    const sections = feedSections(
      PACKS,
      new Map([...BY_PACK, ['custom', [sticker('c1', 'custom')]]]),
      [recent('a1')],
      []
    );

    expect(
      sections.map(({ id, hasCreateTile }) => {
        return [id, hasCreateTile];
      })
    ).toEqual([
      ['recent', false],
      ['custom', true],
      ['tg:a', false],
      ['tg:b', false],
    ]);
  });

  it('стикеры пака идут в порядке группы, с отправкой своего стикера и именем по эмодзи', () => {
    const [, packA] = feedSections(PACKS, BY_PACK, [], []);

    expect(packA?.items).toEqual([
      {
        key: 'a1',
        item: { kind: 'local', stickerId: 'a1' },
        sticker: BY_PACK.get('tg:a')?.[0],
        urlKey: 'a1',
        name: {
          send: 'Отправить стикер 😀',
          menu: 'Действия: стикер 😀',
          preview: 'Предпросмотр стикера 😀',
        },
      },
      {
        key: 'a2',
        item: { kind: 'local', stickerId: 'a2' },
        sticker: BY_PACK.get('tg:a')?.[1],
        urlKey: 'a2',
        name: {
          send: 'Отправить стикер',
          menu: 'Действия: стикер',
          preview: 'Предпросмотр стикера',
        },
      },
    ]);
  });

  it('имя своего стикера содержит его подпись', () => {
    const captioned: StickerRec = { ...sticker('c1', 'custom'), caption: 'Привет' };
    const [custom] = feedSections(PACKS, new Map([['custom', [captioned]]]), [], []);

    expect(custom?.items[0]?.name.send).toBe('Отправить стикер «Привет»');
  });

  it('на английском — английские названия и подсказки, названия паков Telegram без перевода', () => {
    setLocale('en');

    const captioned: StickerRec = { ...sticker('c1', 'custom'), caption: 'hi' };
    const sections = feedSections(
      [...PACKS, pack('tg:c', 'Коты')],
      new Map([
        ['custom', [captioned]],
        ['tg:a', [sticker('a1', 'tg:a')]],
      ]),
      [recent('a1')],
      []
    );

    expect(
      sections.map(({ id, title, hint }) => {
        return [id, title, hint];
      })
    ).toEqual([
      ['recent', 'Recent', ''],
      ['custom', 'My stickers', ''],
      ['tg:a', 'A', 'Pack is empty'],
      ['tg:b', 'B', 'Pack is empty'],
      ['tg:c', 'Коты', 'Pack is empty'],
    ]);
    expect(sections[1]?.items[0]?.name.send).toBe('Send sticker “hi”');
  });

  it('недавние — первым разделом в порядке записей, удалённые стикеры и GIF пропускаются', () => {
    const gif: RecentRec = {
      key: 'r:giphy:1',
      ts: 0,
      item: {
        kind: 'remote',
        gif: {
          id: 'giphy:1',
          provider: 'giphy',
          url: 'u',
          previewUrl: 'p',
          width: 1,
          height: 1,
        },
      },
    };
    const [first, second] = feedSections(
      PACKS,
      BY_PACK,
      [recent('b1'), recent('gone'), gif, recent('a1')],
      []
    );

    expect(first?.id).toBe('recent');
    expect(first?.title).toBe('Недавние');
    expect(
      first?.items.map(({ key }) => {
        return key;
      })
    ).toEqual(['l:b1', 'l:a1']);
    expect(second?.id).toBe('custom');
  });

  it('недавние только из удалённых стикеров — раздела нет', () => {
    const [first] = feedSections(PACKS, BY_PACK, [recent('gone')], []);

    expect(first?.id).toBe('custom');
  });

  it('«Избранное» — первым разделом, выше недавних, в порядке записей от новых к старым', () => {
    const a1 = BY_PACK.get('tg:a')?.[0] || sticker('a1', 'tg:a');
    const b1 = BY_PACK.get('tg:b')?.[0] || sticker('b1', 'tg:b');
    const sections = feedSections(
      PACKS,
      BY_PACK,
      [recent('a2')],
      [favorite(b1, 2), favorite(a1, 1)]
    );
    const [first, second] = sections;

    expect(first?.id).toBe('favorite');
    expect(first?.title).toBe('Избранное');
    expect(first?.pack).toBeNull();
    expect(first?.hasCreateTile).toBe(false);
    expect(keysOf(first)).toEqual(['l:b1', 'l:a1']);
    expect(first?.items[0]?.item).toEqual({ kind: 'local', stickerId: 'b1' });
    expect(first?.items[0]?.name.send).toBe('Отправить стикер');
    expect(second?.id).toBe('recent');
  });

  it('пустое избранное — раздела нет', () => {
    const sections = feedSections(PACKS, BY_PACK, [recent('a1')], []);

    expect(
      sections.map(({ id }) => {
        return id;
      })
    ).toEqual(['recent', 'custom', 'tg:a', 'tg:b']);
  });

  it('GIF из избранного в ленту стикеров не попадают', () => {
    const gif: FavoriteRec = {
      key: 'r:giphy:1',
      ts: 0,
      item: {
        kind: 'remote',
        gif: {
          id: 'giphy:1',
          provider: 'giphy',
          url: 'u',
          previewUrl: 'p',
          width: 1,
          height: 1,
        },
      },
    };
    const [first] = feedSections(PACKS, BY_PACK, [], [gif]);

    expect(first?.id).toBe('custom');
  });

  it('стикер из библиотеки берётся из библиотеки с её URL, удалённый — снимком с отдельным URL', () => {
    const libraryA1 = BY_PACK.get('tg:a')?.[0] || sticker('a1', 'tg:a');
    const staleA1: StickerRec = { ...libraryA1, emoji: '🙂' };
    const gone: StickerRec = { ...sticker('gone', 'tg:x', '🐱'), caption: 'кот' };
    const [first] = feedSections(
      PACKS,
      BY_PACK,
      [],
      [favorite(gone, 2), favorite(staleA1, 1)]
    );

    expect(first?.items[0]?.sticker).toBe(gone);
    expect(first?.items[0]?.urlKey).toBe('fav:gone');
    expect(first?.items[0]?.name.send).toBe('Отправить стикер «кот»');
    expect(first?.items[1]?.sticker).toBe(libraryA1);
    expect(first?.items[1]?.urlKey).toBe('a1');
  });

  it('у стикеров паков и недавних URL — по id стикера', () => {
    const [recentSection, , packA] = feedSections(PACKS, BY_PACK, [recent('b1')], []);

    expect(recentSection?.items[0]?.urlKey).toBe('b1');
    expect(packA?.items[0]?.urlKey).toBe('a1');
  });

  describe('лимит недавних', () => {
    const many = Array.from({ length: 20 }, (_, index) => {
      return sticker(`s${index}`, 'tg:many');
    });
    const manyPacks = [...PACKS, pack('tg:many', 'Много')];
    const manyByPack: StickersByPack = new Map([...BY_PACK, ['tg:many', many]]);
    const manyRecent = many.map(({ id }) => {
      return recent(id);
    });

    it('15 недавних — показаны 14 последних', () => {
      const [first] = feedSections(manyPacks, manyByPack, manyRecent.slice(0, 15), []);

      expect(first?.id).toBe('recent');
      expect(keysOf(first)).toHaveLength(14);
      expect(keysOf(first).at(-1)).toBe('l:s13');
    });

    it('избранное не показывается в недавних, их место занимают следующие по свежести', () => {
      const favorites = [many[0], many[5], many[13]].map((snapshot) => {
        return favorite(snapshot || sticker('x', 'tg:many'));
      });
      const [, recentSection] = feedSections(
        manyPacks,
        manyByPack,
        manyRecent,
        favorites
      );
      const keys = keysOf(recentSection);

      expect(keys).toHaveLength(14);
      expect(keys).not.toContain('l:s0');
      expect(keys).not.toContain('l:s5');
      expect(keys).not.toContain('l:s13');
      expect(keys.at(-1)).toBe('l:s16');
    });

    it('недавние только из избранных — раздела нет', () => {
      const a1 = BY_PACK.get('tg:a')?.[0] || sticker('a1', 'tg:a');
      const sections = feedSections(PACKS, BY_PACK, [recent('a1')], [favorite(a1)]);

      expect(
        sections.map(({ id }) => {
          return id;
        })
      ).toEqual(['favorite', 'custom', 'tg:a', 'tg:b']);
    });
  });
});
