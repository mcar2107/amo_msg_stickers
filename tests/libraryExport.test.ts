import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  FavoriteRec,
  Pack,
  RecentKind,
  RecentRec,
  RemoteGif,
  StickerRec,
} from '@core/db.types';
import { t } from '@core/i18n';
import type { ExportProgress } from '@core/libraryFile';
import {
  compareWithLibrary,
  exportLibrary,
  libraryFileName,
  MAX_CAPTION_GRAPHEMES,
  MAX_FILE_STICKERS,
  MAX_STICKER_BYTES,
  MAX_TITLE_GRAPHEMES,
  packFileName,
  prepareImport,
  readLibraryFile,
} from '@core/libraryFile';
import { BYTES_IN_MB } from '@core/net';
import { readZipDirectory, readZipEntry } from '@core/zip';

import { makeGif } from './helpers';

/**
 * Библиотека, которую видит выгрузка через функции `db.ts`.
 */
const library = vi.hoisted(() => {
  return {
    packs: [] as Pack[],
    stickers: [] as StickerRec[],
    favorites: [] as FavoriteRec[],
    recent: [] as RecentRec[],
  };
});

/**
 * Запись в базу выгрузке запрещена: вызов любой из них — провал теста.
 */
const writes = vi.hoisted(() => {
  return { touchPack: vi.fn(), putPack: vi.fn(), pushRecent: vi.fn() };
});

vi.mock('@core/db', () => {
  const byCreatedAt = (a: StickerRec, b: StickerRec) => {
    return a.createdAt - b.createdAt;
  };

  const newestFirst = (a: Pick<RecentRec, 'ts'>, b: Pick<RecentRec, 'ts'>) => {
    return b.ts - a.ts;
  };

  return {
    CUSTOM_PACK_ID: 'custom',
    ...writes,
    listPacks: vi.fn(async () => {
      return library.packs;
    }),
    getPack: vi.fn(async (id: string) => {
      return library.packs.find((pack) => {
        return pack.id === id;
      });
    }),
    listStickers: vi.fn(async (packId: string) => {
      return library.stickers
        .filter((sticker) => {
          return sticker.packId === packId;
        })
        .sort(byCreatedAt);
    }),
    listAllStickers: vi.fn(async () => {
      const groups = new Map<string, StickerRec[]>();

      for (const sticker of [...library.stickers].sort(byCreatedAt)) {
        groups.set(sticker.packId, [...(groups.get(sticker.packId) || []), sticker]);
      }

      return groups;
    }),
    listFavorites: vi.fn(async () => {
      return [...library.favorites].sort(newestFirst);
    }),
    listRecent: vi.fn(async (kind: RecentKind) => {
      return library.recent
        .filter(({ item }) => {
          return (item.kind === 'local' ? 'sticker' : 'gif') === kind;
        })
        .sort(newestFirst);
    }),
  };
});

afterEach(() => {
  library.packs = [];
  library.stickers = [];
  library.favorites = [];
  library.recent = [];
  vi.clearAllMocks();
});

const NOW = new Date(2026, 0, 5, 12, 30);

/**
 * GIF стикера: стороны различаются, чтобы план проверял их по заголовку.
 *
 * @param side — ширина GIF
 * @returns GIF `image/gif`
 */
const gifBlob = (side: number) => {
  return new Blob([makeGif(side, side + 1)], { type: 'image/gif' });
};

/**
 * @param fields — поля стикера, которыми он отличается
 * @returns запись стикера
 */
const sticker = (
  fields: Pick<StickerRec, 'id' | 'packId' | 'createdAt'> & Partial<StickerRec>
): StickerRec => {
  const blob = fields.blob || gifBlob(4 + fields.createdAt);

  return { width: 1, height: 1, ...fields, blob };
};

/**
 * Блоб с подменённым размером: проверки пределов идут до чтения данных, и настоящие гигабайты не нужны.
 *
 * @param size — размер, который увидит выгрузка
 * @returns блоб
 */
const sizedBlob = (size: number) => {
  const blob = new Blob([new Uint8Array(1)]);

  Object.defineProperty(blob, 'size', { value: size });

  return blob;
};

/**
 * Библиотека из трёх паков: свои стикеры, пак Telegram с удалённой обложкой и пак Telegram без `sourceRef`.
 */
const seedLibrary = () => {
  library.packs = [
    { id: 'custom', title: 'Мои стикеры', source: 'custom', createdAt: 1 },
    {
      id: 'tg:Old',
      title: 'Старый',
      source: 'telegram',
      createdAt: 10,
      usedAt: 100,
    },
    {
      id: 'tg:Cats',
      title: 'Котики',
      source: 'telegram',
      sourceRef: 'Cats',
      coverId: 'tg:deleted',
      createdAt: 20,
      usedAt: 200,
    },
  ];
  library.stickers = [
    sticker({ id: 'tg:c2', packId: 'tg:Cats', createdAt: 2, emoji: '😺' }),
    sticker({ id: 'tg:c1', packId: 'tg:Cats', createdAt: 1, emoji: '😀' }),
    sticker({ id: 'tg:o1', packId: 'tg:Old', createdAt: 3 }),
    sticker({
      id: 'abc123',
      packId: 'custom',
      createdAt: 4,
      caption: 'я'.repeat(250),
      emoji: '',
    }),
  ];
};

/**
 * @param blob — архив выгрузки
 * @returns разобранный `manifest.json` и имена записей архива
 */
const readArchive = async (blob: Blob) => {
  const directory = await readZipDirectory(blob, { maxEntries: 100 });
  const entry = directory.entries.get('manifest.json');

  if (!entry) throw new Error('нет manifest.json');
  const { blob: manifest } = await readZipEntry(blob, entry, { maxBytes: 1_000_000 });
  const text = await manifest.text();

  return { manifest: JSON.parse(text) as unknown, names: [...directory.entries.keys()] };
};

describe('exportLibrary — библиотека', () => {
  it('пишет паки в порядке ленты, время паков и урезанные строки', async () => {
    seedLibrary();
    const result = await exportLibrary({ now: NOW });
    const { manifest, names } = await readArchive(result.blob);

    expect(result.fileName).toBe('amo-stickers-2026-01-05.amostickers');
    expect(result.stickerCount).toBe(4);
    expect(names).toEqual([
      'manifest.json',
      'stickers/0.gif',
      'stickers/1.gif',
      'stickers/2.gif',
      'stickers/3.gif',
    ]);
    expect(manifest).toEqual({
      format: 'amo-stickers',
      version: 1,
      packs: [
        {
          id: 'custom',
          source: 'custom',
          title: 'Мои стикеры',
          createdAt: 1,
          stickers: [
            {
              id: 'abc123',
              file: 'stickers/0.gif',
              caption: 'я'.repeat(MAX_CAPTION_GRAPHEMES),
            },
          ],
        },
        {
          id: 'tg:Cats',
          source: 'telegram',
          title: 'Котики',
          sourceRef: 'Cats',
          createdAt: 20,
          usedAt: 200,
          stickers: [
            { id: 'tg:c1', file: 'stickers/1.gif', emoji: '😀' },
            { id: 'tg:c2', file: 'stickers/2.gif', emoji: '😺' },
          ],
        },
        {
          id: 'tg:Old',
          source: 'telegram',
          title: 'Старый',
          createdAt: 10,
          usedAt: 100,
          stickers: [{ id: 'tg:o1', file: 'stickers/3.gif' }],
        },
      ],
    });
  });

  it('выгрузил → прочитал → тот же план', async () => {
    seedLibrary();
    const { blob } = await exportLibrary({ now: NOW });
    const libraryFile = await readLibraryFile(blob);
    const card = compareWithLibrary(libraryFile.manifest, {
      packIds: new Set(),
      stickerIds: new Set(),
      favoriteKeys: new Set(),
      recent: [],
    });
    const plan = await prepareImport(libraryFile, card);
    const summary = plan.packs.map(({ stickers, ...pack }) => {
      return {
        ...pack,
        stickers: stickers.map(({ blob: gif, ...rest }) => {
          return { ...rest, size: gif.size };
        }),
      };
    });

    expect(summary).toEqual([
      {
        id: 'custom',
        source: 'custom',
        title: 'Мои стикеры',
        createdAt: 1,
        stickers: [
          {
            id: 'abc123',
            width: 8,
            height: 9,
            caption: 'я'.repeat(MAX_CAPTION_GRAPHEMES),
            size: makeGif(8, 9).byteLength,
          },
        ],
      },
      {
        id: 'tg:Cats',
        source: 'telegram',
        title: 'Котики',
        sourceRef: 'Cats',
        createdAt: 20,
        usedAt: 200,
        stickers: [
          {
            id: 'tg:c1',
            width: 5,
            height: 6,
            emoji: '😀',
            size: makeGif(5, 6).byteLength,
          },
          {
            id: 'tg:c2',
            width: 6,
            height: 7,
            emoji: '😺',
            size: makeGif(6, 7).byteLength,
          },
        ],
      },
      {
        id: 'tg:Old',
        source: 'telegram',
        title: 'Старый',
        createdAt: 10,
        usedAt: 100,
        stickers: [{ id: 'tg:o1', width: 7, height: 8, size: makeGif(7, 8).byteLength }],
      },
    ]);
  });

  it('обложку пишет, только если её стикер есть в паке', async () => {
    seedLibrary();
    library.packs = library.packs.map((pack) => {
      return pack.id === 'tg:Old' ? { ...pack, coverId: 'tg:o1' } : pack;
    });
    const { manifest } = await readArchive((await exportLibrary({ now: NOW })).blob);

    expect(manifest).toMatchObject({
      packs: [{ id: 'custom' }, { id: 'tg:Cats' }, { id: 'tg:Old', coverId: 'tg:o1' }],
    });
    expect(JSON.stringify(manifest)).not.toContain('tg:deleted');
  });

  it('пустые паки не выгружает', async () => {
    seedLibrary();
    library.packs.push({
      id: 'tg:Empty',
      title: 'Пусто',
      source: 'telegram',
      createdAt: 5,
    });
    const { manifest } = await readArchive((await exportLibrary({ now: NOW })).blob);

    expect(JSON.stringify(manifest)).not.toContain('tg:Empty');
  });

  it('ход — до первого стикера и после каждого', async () => {
    seedLibrary();
    const progress: ExportProgress[] = [];

    await exportLibrary({
      now: NOW,
      onProgress: (step) => {
        progress.push(step);
      },
    });

    expect(progress).toEqual([
      { done: 0, total: 4 },
      { done: 1, total: 4 },
      { done: 2, total: 4 },
      { done: 3, total: 4 },
      { done: 4, total: 4 },
    ]);
  });

  it('ничего не пишет в базу', async () => {
    seedLibrary();
    await exportLibrary({ now: NOW });

    expect(writes.touchPack).not.toHaveBeenCalled();
    expect(writes.putPack).not.toHaveBeenCalled();
    expect(writes.pushRecent).not.toHaveBeenCalled();
  });

  it('пустая библиотека — ошибка, а не файл', async () => {
    await expect(exportLibrary({ now: NOW })).rejects.toThrow(
      t('error.libraryFile.libraryExportEmpty')
    );
  });

  it('текст пустой библиотеки встаёт в статус сбоя одной фразой — без своего префикса', () => {
    const status = t('status.exportFailed', {
      message: t('error.libraryFile.libraryExportEmpty'),
    });

    expect(status.split(':')).toHaveLength(2);
  });

  it('больше 10 000 стикеров — ошибка с советом выгружать по пакам', async () => {
    const blob = gifBlob(4);

    library.packs = [{ id: 'custom', title: 'Мои', source: 'custom', createdAt: 1 }];
    library.stickers = Array.from({ length: MAX_FILE_STICKERS + 1 }, (_value, index) => {
      return sticker({ id: `s${index}`, packId: 'custom', createdAt: index, blob });
    });

    await expect(exportLibrary({ now: NOW })).rejects.toThrow(
      t('error.libraryFile.exportTooBig', { max: MAX_FILE_STICKERS })
    );
  });

  it('архив от 4 ГиБ — та же ошибка', async () => {
    library.packs = [{ id: 'custom', title: 'Мои', source: 'custom', createdAt: 1 }];
    library.stickers = Array.from({ length: 600 }, (_value, index) => {
      return sticker({
        id: `s${index}`,
        packId: 'custom',
        createdAt: index,
        blob: sizedBlob(MAX_STICKER_BYTES),
      });
    });

    await expect(exportLibrary({ now: NOW })).rejects.toThrow(
      t('error.libraryFile.exportTooBig', { max: MAX_FILE_STICKERS })
    );
  });

  it('GIF больше 8 МБ — ошибка с названием пака', async () => {
    library.packs = [
      { id: 'tg:Cats', title: 'Котики', source: 'telegram', createdAt: 1 },
    ];
    library.stickers = [
      sticker({
        id: 'tg:big',
        packId: 'tg:Cats',
        createdAt: 1,
        blob: sizedBlob(MAX_STICKER_BYTES + 1),
      }),
    ];

    await expect(exportLibrary({ now: NOW })).rejects.toThrow(
      t('error.libraryFile.gifTooBig', {
        title: 'Котики',
        size: MAX_STICKER_BYTES / BYTES_IN_MB,
      })
    );
  });
});

/**
 * Разделы сырого `manifest.json` — без гарда, чтобы сравнить с прочитанным.
 */
type ManifestSections = Partial<Record<'favorites' | 'recent', unknown[]>>;

/**
 * @param id — id GIF у источника
 * @param fields — поля, которыми GIF отличается
 * @returns GIF из поиска
 */
const remoteGif = (id: string, fields: Partial<RemoteGif> = {}): RemoteGif => {
  return {
    id,
    provider: 'giphy',
    title: id,
    url: `https://media.giphy.com/${id}.gif`,
    previewUrl: `https://media.giphy.com/${id}_s.gif`,
    width: 100,
    height: 80,
    ...fields,
  };
};

/**
 * @param gif — GIF из поиска
 * @param ts — время добавления
 * @returns запись избранной GIF
 */
const favoriteGif = (gif: RemoteGif, ts: number): FavoriteRec => {
  return { key: `r:${gif.provider}:${gif.id}`, ts, item: { kind: 'remote', gif } };
};

/**
 * @param snapshot — запись стикера на момент добавления
 * @param ts — время добавления
 * @returns запись избранного стикера
 */
const favoriteSticker = (snapshot: StickerRec, ts: number): FavoriteRec => {
  return {
    key: `l:${snapshot.id}`,
    ts,
    item: { kind: 'local', stickerId: snapshot.id },
    sticker: snapshot,
  };
};

/**
 * @param stickerId — id стикера библиотеки
 * @param ts — время отправки
 * @returns запись недавнего стикера
 */
const recentSticker = (stickerId: string, ts: number): RecentRec => {
  return { key: `l:${stickerId}`, ts, item: { kind: 'local', stickerId } };
};

/**
 * @param gif — GIF из поиска
 * @param ts — время отправки
 * @returns запись недавней GIF
 */
const recentGif = (gif: RemoteGif, ts: number): RecentRec => {
  return { key: `r:${gif.provider}:${gif.id}`, ts, item: { kind: 'remote', gif } };
};

/**
 * Библиотека из `seedLibrary` с избранным и недавними: избранный стикер пака, снимки стикеров удалённого пака и
 * удалённого своего, избранная GIF; недавние — стикер пака, стикер удалённого пака и две GIF.
 */
const seedLists = () => {
  const catSticker = library.stickers.find(({ id }) => {
    return id === 'tg:c1';
  });

  if (!catSticker) throw new Error('нет tg:c1');
  library.favorites = [
    favoriteSticker(catSticker, 50),
    favoriteSticker(
      sticker({ id: 'tg:gone', packId: 'tg:Gone', createdAt: 9, emoji: '👋' }),
      40
    ),
    favoriteSticker(
      sticker({ id: 'zz9', packId: 'custom', createdAt: 10, caption: 'привет' }),
      35
    ),
    favoriteGif(remoteGif('fav', { title: 'т'.repeat(200) }), 30),
  ];
  library.recent = [
    recentSticker('tg:c2', 20),
    recentSticker('tg:gone2', 25),
    recentGif(remoteGif('r1', { provider: 'klipy', title: undefined }), 15),
    recentGif(remoteGif('r2'), 22),
  ];
};

describe('exportLibrary — избранное и недавние', () => {
  it('пишет ссылки, снимки со своим GIF после стикеров паков и GIF', async () => {
    seedLibrary();
    seedLists();
    const result = await exportLibrary({ now: NOW });
    const { manifest, names } = await readArchive(result.blob);

    expect(result.stickerCount).toBe(6);
    expect(names).toEqual([
      'manifest.json',
      'stickers/0.gif',
      'stickers/1.gif',
      'stickers/2.gif',
      'stickers/3.gif',
      'stickers/4.gif',
      'stickers/5.gif',
    ]);
    expect(manifest).toMatchObject({
      favorites: [
        { kind: 'sticker', id: 'tg:c1', ts: 50 },
        {
          kind: 'sticker',
          id: 'tg:gone',
          ts: 40,
          file: 'stickers/4.gif',
          packId: 'tg:Gone',
          emoji: '👋',
        },
        {
          kind: 'sticker',
          id: 'zz9',
          ts: 35,
          file: 'stickers/5.gif',
          packId: 'custom',
          caption: 'привет',
        },
        {
          kind: 'gif',
          ts: 30,
          gif: {
            provider: 'giphy',
            id: 'fav',
            title: 'т'.repeat(MAX_TITLE_GRAPHEMES),
            url: 'https://media.giphy.com/fav.gif',
            previewUrl: 'https://media.giphy.com/fav_s.gif',
            width: 100,
            height: 80,
          },
        },
      ],
      recent: [
        { kind: 'gif', ts: 22, gif: { provider: 'giphy', id: 'r2' } },
        { kind: 'sticker', id: 'tg:c2', ts: 20 },
        { kind: 'gif', ts: 15, gif: { provider: 'klipy', id: 'r1' } },
      ],
    });

    expect((manifest as ManifestSections).favorites?.[0]).toEqual({
      kind: 'sticker',
      id: 'tg:c1',
      ts: 50,
    });
    expect(JSON.stringify(manifest)).not.toContain('tg:gone2');
    expect(JSON.stringify(manifest)).not.toContain('"title":null');
  });

  it('выгрузил → прочитал: те же избранное, недавние и GIF снимков', async () => {
    seedLibrary();
    seedLists();
    const { blob } = await exportLibrary({ now: NOW });
    const { manifest: written } = await readArchive(blob);
    const libraryFile = await readLibraryFile(blob);

    const { favorites, recent } = written as ManifestSections;

    expect(libraryFile.manifest.favorites).toEqual(favorites);
    expect(libraryFile.manifest.recent).toEqual(recent);

    const snapshot = libraryFile.entries.get('tg:gone');

    if (!snapshot) throw new Error('нет записи снимка');
    const { blob: gif } = await readZipEntry(blob, snapshot, { maxBytes: 1_000_000 });

    expect(gif.size).toBe(makeGif(13, 14).byteLength);
  });

  it('ход и итог считают и снимки', async () => {
    seedLibrary();
    seedLists();
    const progress: ExportProgress[] = [];

    await exportLibrary({
      now: NOW,
      onProgress: (step) => {
        progress.push(step);
      },
    });

    expect(progress.at(-1)).toEqual({ done: 6, total: 6 });
  });

  it('GIF, которую не прочитает загрузка, не выгружается', async () => {
    seedLibrary();
    library.favorites = [
      favoriteGif(remoteGif('evil', { url: 'https://evil.example/a.gif' }), 2),
      favoriteGif(remoteGif('ok'), 1),
    ];
    const { manifest } = await readArchive((await exportLibrary({ now: NOW })).blob);

    expect(manifest).toMatchObject({ favorites: [{ kind: 'gif', gif: { id: 'ok' } }] });
    expect(JSON.stringify(manifest)).not.toContain('evil');
  });

  it('библиотека только с избранными GIF выгружается', async () => {
    library.favorites = [
      favoriteGif(remoteGif('a'), 3),
      favoriteGif(remoteGif('b'), 2),
      favoriteGif(remoteGif('c'), 1),
    ];
    const result = await exportLibrary({ now: NOW });
    const { manifest, names } = await readArchive(result.blob);

    expect(result.fileName).toBe('amo-stickers-2026-01-05.amostickers');
    expect(result.stickerCount).toBe(0);
    expect(names).toEqual(['manifest.json']);
    expect(manifest).toMatchObject({ packs: [], favorites: [{}, {}, {}] });
    expect((await readLibraryFile(result.blob)).manifest.favorites).toHaveLength(3);
  });

  it('только недавний стикер удалённого пака — выгружать нечего', async () => {
    library.recent = [recentSticker('tg:gone', 1)];

    await expect(exportLibrary({ now: NOW })).rejects.toThrow(
      t('error.libraryFile.libraryExportEmpty')
    );
  });

  it('без избранного и недавних разделов в описании нет', async () => {
    seedLibrary();
    const { manifest } = await readArchive((await exportLibrary({ now: NOW })).blob);

    expect(manifest).not.toHaveProperty('favorites');
    expect(manifest).not.toHaveProperty('recent');
  });

  it('снимок больше 8 МБ — ошибка избранного', async () => {
    library.favorites = [
      favoriteSticker(
        sticker({
          id: 'tg:big',
          packId: 'tg:Gone',
          createdAt: 1,
          blob: sizedBlob(MAX_STICKER_BYTES + 1),
        }),
        1
      ),
    ];

    await expect(exportLibrary({ now: NOW })).rejects.toThrow(
      t('error.libraryFile.favoriteGifTooBig', { size: MAX_STICKER_BYTES / BYTES_IN_MB })
    );
  });

  it('снимки считаются в предел стикеров файла', async () => {
    const blob = gifBlob(4);

    library.packs = [{ id: 'custom', title: 'Мои', source: 'custom', createdAt: 1 }];
    library.stickers = Array.from({ length: MAX_FILE_STICKERS }, (_value, index) => {
      return sticker({ id: `s${index}`, packId: 'custom', createdAt: index, blob });
    });
    library.favorites = [
      favoriteSticker(sticker({ id: 'gone', packId: 'custom', createdAt: 1, blob }), 1),
    ];

    await expect(exportLibrary({ now: NOW })).rejects.toThrow(
      t('error.libraryFile.exportTooBig', { max: MAX_FILE_STICKERS })
    );
  });

  it('ничего не пишет в базу', async () => {
    seedLibrary();
    seedLists();
    await exportLibrary({ now: NOW });

    expect(writes.touchPack).not.toHaveBeenCalled();
    expect(writes.putPack).not.toHaveBeenCalled();
    expect(writes.pushRecent).not.toHaveBeenCalled();
  });
});

describe('exportLibrary — один пак', () => {
  it('без времени пака и с именем по названию', async () => {
    seedLibrary();
    const result = await exportLibrary({ packId: 'tg:Cats', now: NOW });
    const { manifest } = await readArchive(result.blob);

    expect(result.fileName).toBe('Котики.amostickers');
    expect(result.stickerCount).toBe(2);
    expect(manifest).toEqual({
      format: 'amo-stickers',
      version: 1,
      packs: [
        {
          id: 'tg:Cats',
          source: 'telegram',
          title: 'Котики',
          sourceRef: 'Cats',
          stickers: [
            { id: 'tg:c1', file: 'stickers/0.gif', emoji: '😀' },
            { id: 'tg:c2', file: 'stickers/1.gif', emoji: '😺' },
          ],
        },
      ],
    });
  });

  it('без избранного и недавних, даже если стикеры пака в них', async () => {
    seedLibrary();
    seedLists();
    const { manifest } = await readArchive(
      (await exportLibrary({ packId: 'tg:Cats', now: NOW })).blob
    );

    expect(manifest).not.toHaveProperty('favorites');
    expect(manifest).not.toHaveProperty('recent');
  });

  it('«Мои стикеры» — имя файла на языке интерфейса', async () => {
    seedLibrary();
    const result = await exportLibrary({ packId: 'custom', now: NOW });

    expect(result.fileName).toBe(`${t('pack.custom')}.amostickers`);
    expect(result.stickerCount).toBe(1);
  });

  it('пак без стикеров — ошибка', async () => {
    seedLibrary();
    library.stickers = [];

    await expect(exportLibrary({ packId: 'tg:Cats', now: NOW })).rejects.toThrow(
      t('error.libraryFile.packExportEmpty')
    );
  });

  it('запись, которую не прочитает загрузка, — ошибка выгрузки, архив не собирается', async () => {
    seedLibrary();
    library.packs = library.packs.map((pack) => {
      return pack.id === 'tg:Cats' ? { ...pack, sourceRef: 'Other' } : pack;
    });
    const onProgress = vi.fn();

    await expect(exportLibrary({ now: NOW, onProgress })).rejects.toThrow(
      t('error.libraryFile.exportInvalid')
    );
    await expect(
      exportLibrary({ packId: 'tg:Cats', now: NOW, onProgress })
    ).rejects.toThrow(t('error.libraryFile.exportInvalid'));
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('больше 10 000 стикеров — ошибка пака', async () => {
    const blob = gifBlob(4);

    library.packs = [{ id: 'custom', title: 'Мои', source: 'custom', createdAt: 1 }];
    library.stickers = Array.from({ length: MAX_FILE_STICKERS + 1 }, (_value, index) => {
      return sticker({ id: `s${index}`, packId: 'custom', createdAt: index, blob });
    });

    await expect(exportLibrary({ packId: 'custom', now: NOW })).rejects.toThrow(
      t('error.libraryFile.packTooBig', { max: MAX_FILE_STICKERS })
    );
  });
});

describe('packFileName', () => {
  it('без разделителей путей, `:` и символов направления текста', () => {
    const name = packFileName({ id: 'tg:Evil', title: '\u202E../a:b\u2066' });

    expect(name).toBe('_a_b.amostickers');
    expect(name).not.toMatch(/[/\\:\u202E\u2066]/u);
  });

  it.each(['..Котики', ' . .Котики'])(
    'снимает точки и пробелы в начале «%s»: имя с точки — скрытый файл в macOS и Linux',
    (title) => {
      expect(packFileName({ id: 'tg:X', title })).toBe('Котики.amostickers');
    }
  );

  it('точки в начале не занимают предел длины', () => {
    expect(packFileName({ id: 'tg:X', title: `${'.'.repeat(150)}Котики` })).toBe(
      'Котики.amostickers'
    );
  });

  it('заменяет символы, недопустимые в Windows, и снимает управляющие', () => {
    expect(packFileName({ id: 'tg:X', title: 'a*b?c"d<e>f|g\\h\u0007i' })).toBe(
      'a_b_c_d_e_f_g_hi.amostickers'
    );
  });

  it('снимает точки и пробелы в конце', () => {
    expect(packFileName({ id: 'tg:X', title: 'Котики. . ' })).toBe('Котики.amostickers');
  });

  it.each(['CON', 'con', 'Lpt1', 'NUL.txt', '  .', '...', '', '\u202E'])(
    'запасное имя для «%s»',
    (title) => {
      expect(packFileName({ id: 'tg:X', title })).toBe('amo-stickers.amostickers');
    }
  );

  it('урезает до 100 графем', () => {
    const name = packFileName({ id: 'tg:X', title: '👍🏽'.repeat(150) });

    expect(name).toBe(`${'👍🏽'.repeat(100)}.amostickers`);
  });

  it('свой пак — по названию на языке интерфейса', () => {
    expect(packFileName({ id: 'custom', title: 'Whatever' })).toBe(
      `${t('pack.custom')}.amostickers`
    );
  });
});

describe('libraryFileName', () => {
  it('по местной дате', () => {
    expect(libraryFileName(new Date(2026, 8, 30, 23, 59))).toBe(
      'amo-stickers-2026-09-30.amostickers'
    );
  });
});
