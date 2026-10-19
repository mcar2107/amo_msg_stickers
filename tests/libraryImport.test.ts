import { describe, expect, it } from 'vitest';

import type { Pack, RecentRec, StickerRec } from '@core/db.types';
import type {
  ImportPlanPack,
  ImportPlanSticker,
  ManifestGif,
  ManifestRecent,
} from '@core/libraryFile';
import type { ImportLibrary } from '@core/libraryFile/importRecords';
import { buildImportRecords } from '@core/libraryFile/importRecords';

const STARTED_AT = 1000;

/**
 * Запись своего пака, которую передаёт `writeImport`: та же, что создаёт пикер.
 */
const CUSTOM_PACK: Pack = {
  id: 'custom',
  title: 'Мои стикеры',
  source: 'custom',
  createdAt: 0,
};

const OPTIONS = { startedAt: STARTED_AT, customPack: CUSTOM_PACK };

/**
 * Итог записи без избранного и недавних: импорт только паков.
 */
const NO_LISTS = {
  favoriteCount: 0,
  recentCount: 0,
  hasFavoriteStickers: false,
  hasRecentStickers: false,
};

/**
 * Стикер плана.
 *
 * @param id — id стикера
 * @param extra — поля стикера поверх
 * @returns стикер плана
 */
const sticker = (
  id: string,
  extra: Partial<ImportPlanSticker> = {}
): ImportPlanSticker => {
  return {
    id,
    blob: new Blob([id], { type: 'image/gif' }),
    width: 100,
    height: 80,
    ...extra,
  };
};

/**
 * Пак Telegram плана.
 *
 * @param name — имя набора
 * @param ids — id новых стикеров в порядке файла
 * @param extra — поля пака поверх
 * @returns пак плана
 */
const tgPack = (
  name: string,
  ids: string[],
  extra: Partial<ImportPlanPack> = {}
): ImportPlanPack => {
  return {
    id: `tg:${name}`,
    source: 'telegram',
    title: `Пак ${name}`,
    sourceRef: name,
    stickers: ids.map((id) => {
      return sticker(id);
    }),
    ...extra,
  };
};

/**
 * Свой пак плана из чужого файла.
 *
 * @param ids — id новых стикеров в порядке файла
 * @returns пак плана
 */
const customPlanPack = (ids: string[]): ImportPlanPack => {
  return {
    id: 'custom',
    source: 'custom',
    title: 'My stickers',
    createdAt: 777,
    usedAt: 888,
    coverId: ids[0] || '',
    stickers: ids.map((id) => {
      return sticker(id, { caption: `подпись ${id}` });
    }),
  };
};

/**
 * Состояние библиотеки в момент записи.
 *
 * @param state — паки, стикеры и последнее время добавления по пакам
 * @returns состояние для построения записей
 */
const library = (
  state: {
    /**
     * Id паков в библиотеке.
     */
    packIds?: string[];

    /**
     * Id стикеров в библиотеке.
     */
    stickerIds?: string[];

    /**
     * Наибольшее время добавления стикеров по пакам.
     */
    lastStickerAt?: [string, number][];

    /**
     * Ключи избранного.
     */
    favoriteKeys?: string[];

    /**
     * Недавние обоих видов.
     */
    recent?: RecentRec[];

    /**
     * Прочитанные записи стикеров, на которые ссылается избранное плана.
     */
    favoriteStickers?: StickerRec[];
  } = {}
): ImportLibrary => {
  return {
    packIds: new Set(state.packIds || []),
    stickerIds: new Set(state.stickerIds || []),
    lastStickerAt: new Map(state.lastStickerAt || []),
    favoriteKeys: new Set(state.favoriteKeys || []),
    recent: state.recent || [],
    favoriteStickers: new Map(
      (state.favoriteStickers || []).map((rec) => {
        return [rec.id, rec];
      })
    ),
  };
};

describe('buildImportRecords', () => {
  it('новый пак — запись из файла, стикеры по порядку от времени начала', () => {
    const records = buildImportRecords(
      {
        packs: [
          tgPack('cats', ['tg:a', 'tg:b', 'tg:c'], {
            createdAt: 50,
            usedAt: 60,
            coverId: 'tg:b',
          }),
        ],
        favorites: [],
        recent: [],
      },
      library(),
      OPTIONS
    );

    expect(records.packs).toEqual([
      {
        id: 'tg:cats',
        title: 'Пак cats',
        source: 'telegram',
        sourceRef: 'cats',
        createdAt: 50,
        usedAt: 60,
        coverId: 'tg:b',
      },
    ]);
    expect(
      records.stickers.map(({ id, packId, createdAt }) => {
        return [id, packId, createdAt];
      })
    ).toEqual([
      ['tg:a', 'tg:cats', STARTED_AT],
      ['tg:b', 'tg:cats', STARTED_AT + 1],
      ['tg:c', 'tg:cats', STARTED_AT + 2],
    ]);
    expect(records.written).toEqual({
      packIds: ['tg:cats'],
      stickerCount: 3,
      ...NO_LISTS,
    });
  });

  it('стикер несёт GIF, стороны, эмодзи и подпись из плана', () => {
    const planSticker = sticker('tg:a', { emoji: '😀', width: 120, height: 90 });
    const records = buildImportRecords(
      {
        packs: [tgPack('cats', [], { stickers: [planSticker] })],
        favorites: [],
        recent: [],
      },
      library(),
      OPTIONS
    );

    expect(records.stickers).toStrictEqual([
      {
        id: 'tg:a',
        packId: 'tg:cats',
        blob: planSticker.blob,
        width: 120,
        height: 90,
        emoji: '😀',
        createdAt: STARTED_AT,
      },
    ]);
  });

  it('стикер без эмодзи и подписи — без их ключей в записи', () => {
    const planSticker = sticker('tg:a');
    const [record] = buildImportRecords(
      {
        packs: [tgPack('cats', [], { stickers: [planSticker] })],
        favorites: [],
        recent: [],
      },
      library(),
      OPTIONS
    ).stickers;

    expect(record && Object.keys(record)).not.toContain('emoji');
    expect(record && Object.keys(record)).not.toContain('caption');
  });

  it('без времени добавления и использования в файле — время начала и пак без использования', () => {
    const [pack] = buildImportRecords(
      { packs: [tgPack('cats', ['tg:a'])], favorites: [], recent: [] },
      library(),
      OPTIONS
    ).packs;

    expect(pack).toEqual({
      id: 'tg:cats',
      title: 'Пак cats',
      source: 'telegram',
      sourceRef: 'cats',
      createdAt: STARTED_AT,
      coverId: 'tg:a',
    });
    expect(pack).not.toHaveProperty('usedAt');
  });

  it('пак без имени набора в файле — без sourceRef', () => {
    const [pack] = buildImportRecords(
      {
        packs: [
          {
            id: 'tg:cats',
            source: 'telegram',
            title: 'Пак cats',
            stickers: [sticker('tg:a')],
          },
        ],
        favorites: [],
        recent: [],
      },
      library(),
      OPTIONS
    ).packs;

    expect(pack).not.toHaveProperty('sourceRef');
  });

  it('дополнение пака — запись пака не пишется, стикеры после прежних, даже если прежние новее начала', () => {
    const records = buildImportRecords(
      {
        packs: [
          tgPack('cats', ['tg:old1', 'tg:new1', 'tg:new2'], {
            title: 'Другое название',
            usedAt: 99_999,
            coverId: 'tg:new2',
          }),
        ],
        favorites: [],
        recent: [],
      },
      library({
        packIds: ['tg:cats'],
        stickerIds: ['tg:old0', 'tg:old1'],
        lastStickerAt: [['tg:cats', 5000]],
      }),
      OPTIONS
    );

    expect(records.packs).toEqual([]);
    expect(
      records.stickers.map(({ id, createdAt }) => {
        return [id, createdAt];
      })
    ).toEqual([
      ['tg:new1', 5001],
      ['tg:new2', 5002],
    ]);
    expect(records.written).toEqual({
      packIds: ['tg:cats'],
      stickerCount: 2,
      ...NO_LISTS,
    });
  });

  it('пак удалён после карточки — создаётся заново', () => {
    const records = buildImportRecords(
      { packs: [tgPack('cats', ['tg:a', 'tg:b'])], favorites: [], recent: [] },
      library({ packIds: ['tg:dogs'], stickerIds: ['tg:x'] }),
      OPTIONS
    );

    expect(
      records.packs.map(({ id }) => {
        return id;
      })
    ).toEqual(['tg:cats']);
    expect(records.stickers).toHaveLength(2);
  });

  it('стикер появился после карточки — пропускается, обложка — первый оставшийся', () => {
    const records = buildImportRecords(
      {
        packs: [tgPack('cats', ['tg:a', 'tg:b', 'tg:c'], { coverId: 'tg:a' })],
        favorites: [],
        recent: [],
      },
      library({ packIds: ['tg:dogs'], stickerIds: ['tg:a'] }),
      OPTIONS
    );

    expect(
      records.stickers.map(({ id, createdAt }) => {
        return [id, createdAt];
      })
    ).toEqual([
      ['tg:b', STARTED_AT],
      ['tg:c', STARTED_AT + 1],
    ]);
    expect(records.packs[0]?.coverId).toBe('tg:b');
    expect(records.written.stickerCount).toBe(2);
  });

  it('обложка не из стикеров пака — первый стикер', () => {
    const [pack] = buildImportRecords(
      {
        packs: [tgPack('cats', ['tg:a', 'tg:b'], { coverId: 'tg:gone' })],
        favorites: [],
        recent: [],
      },
      library(),
      OPTIONS
    ).packs;

    expect(pack?.coverId).toBe('tg:a');
  });

  it('все стикеры пака заняты — пак не создаётся и в итог не входит', () => {
    const records = buildImportRecords(
      {
        packs: [tgPack('cats', ['tg:a']), tgPack('dogs', ['tg:d'])],
        favorites: [],
        recent: [],
      },
      library({ stickerIds: ['tg:a'] }),
      OPTIONS
    );

    expect(
      records.packs.map(({ id }) => {
        return id;
      })
    ).toEqual(['tg:dogs']);
    expect(records.written).toEqual({
      packIds: ['tg:dogs'],
      stickerCount: 1,
      ...NO_LISTS,
    });
  });

  it('«Мои стикеры» из чужого файла — после своих, запись пака не трогается', () => {
    const records = buildImportRecords(
      { packs: [customPlanPack(['f1', 'f2', 'f3'])], favorites: [], recent: [] },
      library({
        packIds: ['custom'],
        stickerIds: ['own1', 'own2'],
        lastStickerAt: [['custom', 4000]],
      }),
      OPTIONS
    );

    expect(records.packs).toEqual([]);
    expect(
      records.stickers.map(({ id, packId, caption, createdAt }) => {
        return [id, packId, caption, createdAt];
      })
    ).toEqual([
      ['f1', 'custom', 'подпись f1', 4001],
      ['f2', 'custom', 'подпись f2', 4002],
      ['f3', 'custom', 'подпись f3', 4003],
    ]);
  });

  it('«Моих стикеров» нет — запись пикера, а не полей из файла', () => {
    const records = buildImportRecords(
      { packs: [customPlanPack(['f1'])], favorites: [], recent: [] },
      library(),
      OPTIONS
    );

    expect(records.packs).toEqual([CUSTOM_PACK]);
    expect(records.stickers[0]?.createdAt).toBe(STARTED_AT);
  });

  it('пак есть, а его стикеров нет — отсчёт от времени начала', () => {
    const records = buildImportRecords(
      { packs: [customPlanPack(['f1'])], favorites: [], recent: [] },
      library({ packIds: ['custom'] }),
      OPTIONS
    );

    expect(records.packs).toEqual([]);
    expect(records.stickers[0]?.createdAt).toBe(STARTED_AT);
  });

  it('несколько паков — итог в порядке файла, число стикеров по всем', () => {
    const records = buildImportRecords(
      {
        packs: [
          customPlanPack(['f1']),
          tgPack('cats', ['tg:a', 'tg:b']),
          tgPack('dogs', ['tg:d']),
        ],
        favorites: [],
        recent: [],
      },
      library({ packIds: ['tg:dogs'], lastStickerAt: [['tg:dogs', 10]] }),
      OPTIONS
    );

    expect(records.written).toEqual({
      packIds: ['custom', 'tg:cats', 'tg:dogs'],
      stickerCount: 4,
      ...NO_LISTS,
    });
    expect(
      records.packs.map(({ id }) => {
        return id;
      })
    ).toEqual(['custom', 'tg:cats']);
  });

  it('повтор id стикера в плане — второй пропускается', () => {
    const records = buildImportRecords(
      {
        packs: [tgPack('cats', ['tg:a']), tgPack('dogs', ['tg:a', 'tg:d'])],
        favorites: [],
        recent: [],
      },
      library(),
      OPTIONS
    );

    expect(
      records.stickers.map(({ id, packId }) => {
        return [id, packId];
      })
    ).toEqual([
      ['tg:a', 'tg:cats'],
      ['tg:d', 'tg:dogs'],
    ]);
  });

  it('повторная загрузка того же файла — ничего не пишется', () => {
    const records = buildImportRecords(
      { packs: [tgPack('cats', ['tg:a', 'tg:b'])], favorites: [], recent: [] },
      library({
        packIds: ['tg:cats'],
        stickerIds: ['tg:a', 'tg:b'],
        lastStickerAt: [['tg:cats', 3000]],
      }),
      OPTIONS
    );

    expect(records).toEqual({
      packs: [],
      stickers: [],
      favorites: [],
      recent: [],
      recentDeleteKeys: [],
      written: { packIds: [], stickerCount: 0, ...NO_LISTS },
    });
  });
});

/**
 * GIF из поиска в разделе файла.
 *
 * @param id — id у источника
 * @returns данные GIF
 */
const manifestGif = (id: string): ManifestGif => {
  return {
    provider: 'giphy',
    id,
    url: `https://media.giphy.com/${id}.gif`,
    previewUrl: `https://media.giphy.com/${id}_s.gif`,
    width: 100,
    height: 80,
  };
};

/**
 * Запись стикера в библиотеке.
 *
 * @param id — id стикера
 * @param packId — пак стикера
 * @returns запись стикера
 */
const libraryRec = (id: string, packId: string): StickerRec => {
  return {
    id,
    packId,
    blob: new Blob([`lib ${id}`], { type: 'image/gif' }),
    width: 64,
    height: 64,
    emoji: '🙂',
    createdAt: 42,
  };
};

/**
 * Недавний стикер библиотеки.
 *
 * @param id — id стикера
 * @param ts — время отправки
 * @returns запись недавних
 */
const recentSticker = (id: string, ts: number): RecentRec => {
  return { key: `l:${id}`, ts, item: { kind: 'local', stickerId: id } };
};

describe('buildImportRecords: избранное и недавние', () => {
  it('избранный стикер нового пака — снимок из записываемой записи стикера', () => {
    const records = buildImportRecords(
      {
        packs: [tgPack('cats', ['tg:a'])],
        favorites: [{ kind: 'sticker', id: 'tg:a', ts: 500 }],
        recent: [],
      },
      library(),
      OPTIONS
    );

    expect(records.favorites).toEqual([
      {
        key: 'l:tg:a',
        ts: 500,
        item: { kind: 'local', stickerId: 'tg:a' },
        sticker: records.stickers[0],
      },
    ]);
    expect(records.written).toMatchObject({
      favoriteCount: 1,
      hasFavoriteStickers: true,
      hasRecentStickers: false,
    });
  });

  it('избранный стикер, уже лежащий в библиотеке, — снимок из его записи', () => {
    const rec = libraryRec('tg:a', 'tg:dogs');
    const records = buildImportRecords(
      { packs: [], favorites: [{ kind: 'sticker', id: 'tg:a', ts: 500 }], recent: [] },
      library({ stickerIds: ['tg:a'], favoriteStickers: [rec] }),
      OPTIONS
    );

    expect(records.favorites).toEqual([
      {
        key: 'l:tg:a',
        ts: 500,
        item: { kind: 'local', stickerId: 'tg:a' },
        sticker: rec,
      },
    ]);
    expect(records.stickers).toEqual([]);
  });

  it('снимок удалённого пака — своя картинка из файла, в паки не пишется', () => {
    const snapshot = sticker('tg:gone', { emoji: '🐱' });
    const records = buildImportRecords(
      {
        packs: [],
        favorites: [
          { kind: 'sticker', id: 'tg:gone', ts: 7, packId: 'tg:old', sticker: snapshot },
        ],
        recent: [],
      },
      library(),
      OPTIONS
    );

    expect(records.favorites).toStrictEqual([
      {
        key: 'l:tg:gone',
        ts: 7,
        item: { kind: 'local', stickerId: 'tg:gone' },
        sticker: {
          id: 'tg:gone',
          packId: 'tg:old',
          blob: snapshot.blob,
          width: 100,
          height: 80,
          emoji: '🐱',
          createdAt: STARTED_AT,
        },
      },
    ]);
    expect(records.stickers).toEqual([]);
    expect(records.packs).toEqual([]);
    expect(records.written).toMatchObject({ favoriteCount: 1, stickerCount: 0 });
  });

  it('снимок с занятым id — запись библиотеки, а не картинка из файла', () => {
    const rec = libraryRec('tg:gone', 'tg:back');
    const records = buildImportRecords(
      {
        packs: [],
        favorites: [
          {
            kind: 'sticker',
            id: 'tg:gone',
            ts: 7,
            packId: 'tg:old',
            sticker: sticker('tg:gone'),
          },
        ],
        recent: [],
      },
      library({ stickerIds: ['tg:gone'], favoriteStickers: [rec] }),
      OPTIONS
    );

    expect(
      records.favorites.map((fav) => {
        return 'sticker' in fav ? fav.sticker : null;
      })
    ).toEqual([rec]);
  });

  it('ссылка на стикер, которого нет ни в записи, ни в библиотеке, — пропуск', () => {
    const records = buildImportRecords(
      { packs: [], favorites: [{ kind: 'sticker', id: 'tg:lost', ts: 5 }], recent: [] },
      library(),
      OPTIONS
    );

    expect(records.favorites).toEqual([]);
    expect(records.written).toMatchObject({
      favoriteCount: 0,
      hasFavoriteStickers: false,
    });
  });

  it('избранное, которое уже есть, не меняется; GIF добавляется без стикерного признака', () => {
    const records = buildImportRecords(
      {
        packs: [tgPack('cats', ['tg:a'])],
        favorites: [
          { kind: 'sticker', id: 'tg:a', ts: 900 },
          { kind: 'gif', ts: 800, gif: manifestGif('old') },
          { kind: 'gif', ts: 700, gif: manifestGif('new') },
        ],
        recent: [],
      },
      library({ favoriteKeys: ['l:tg:a', 'r:giphy:old'] }),
      OPTIONS
    );

    expect(records.favorites).toEqual([
      {
        key: 'r:giphy:new',
        ts: 700,
        item: { kind: 'remote', gif: manifestGif('new') },
      },
    ]);
    expect(records.written).toMatchObject({
      favoriteCount: 1,
      hasFavoriteStickers: false,
    });
  });

  it('недавние сливаются с недавними на момент записи, лишние сверх лимита удаляются', () => {
    const existing = Array.from({ length: 40 }, (_, index) => {
      return recentSticker(`tg:old${index}`, 100 + index);
    });
    const incoming: ManifestRecent[] = [
      { kind: 'sticker', id: 'tg:a', ts: 1000 },
      { kind: 'gif', ts: 50, gif: manifestGif('g') },
      { kind: 'sticker', id: 'tg:b', ts: 1 },
    ];
    const records = buildImportRecords(
      { packs: [tgPack('cats', ['tg:a', 'tg:b'])], favorites: [], recent: incoming },
      library({ recent: existing }),
      OPTIONS
    );

    expect(
      records.recent.map(({ key }) => {
        return key;
      })
    ).toEqual(['l:tg:a', 'r:giphy:g']);
    expect(records.recentDeleteKeys).toEqual(['l:tg:old0']);
    expect(records.written).toMatchObject({ recentCount: 2, hasRecentStickers: true });
  });

  it('у повтора остаётся более позднее время, без дубля', () => {
    const records = buildImportRecords(
      {
        packs: [],
        favorites: [],
        recent: [
          { kind: 'gif', ts: 500, gif: manifestGif('g') },
          { kind: 'sticker', id: 'tg:a', ts: 10 },
        ],
      },
      library({
        stickerIds: ['tg:a'],
        recent: [
          { key: 'r:giphy:g', ts: 100, item: { kind: 'remote', gif: manifestGif('g') } },
          recentSticker('tg:a', 20),
        ],
      }),
      OPTIONS
    );

    expect(records.recent).toEqual([
      { key: 'r:giphy:g', ts: 500, item: { kind: 'remote', gif: manifestGif('g') } },
    ]);
    expect(records.recentDeleteKeys).toEqual([]);
    expect(records.written).toMatchObject({ recentCount: 1, hasRecentStickers: false });
  });

  it('недавний стикер, которого после записи нет в библиотеке, не добавляется', () => {
    const records = buildImportRecords(
      { packs: [], favorites: [], recent: [{ kind: 'sticker', id: 'tg:lost', ts: 10 }] },
      library(),
      OPTIONS
    );

    expect(records.recent).toEqual([]);
    expect(records.written).toMatchObject({ recentCount: 0, hasRecentStickers: false });
  });
});
