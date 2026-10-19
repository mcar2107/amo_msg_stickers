import { IDBFactory, IDBObjectStore, IDBRequest } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FavoriteRec, Pack, RecentRec, RemoteGif, StickerRec } from '@core/db.types';
import type {
  ImportPlan,
  ImportPlanPack,
  ImportPlanSticker,
  ManifestGif,
} from '@core/libraryFile';
import { fileImportFailure } from '@ui/PickerProvider/fileImportOutcome';

import { makeGif } from './helpers';

type Db = typeof import('@core/db');

type LibraryFileModule = typeof import('@core/libraryFile');

/**
 * Запись стикера для сравнения: блоб сравнивается по размеру.
 */
type StickerSnapshot = Omit<StickerRec, 'blob'> & {
  /**
   * Размер блоба GIF в байтах.
   */
  blobSize: number;
};

/**
 * Модуль базы на свежей пустой IndexedDB. `db.ts` держит открытое соединение в модуле, поэтому каждый тест берёт
 * модуль заново после `vi.resetModules`: иначе соединение прошлого теста смотрело бы в его базу.
 */
let db: Db;

/**
 * Модуль файла выгрузки той же загрузки, что `db`: выгрузка и сверка карточки читают ту же базу.
 */
let libraryFile: LibraryFileModule;

/**
 * Свежая пустая база и модули, которые смотрят в неё.
 */
const freshDb = async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBRequest', IDBRequest);
  vi.resetModules();
  db = await import('@core/db');
  libraryFile = await import('@core/libraryFile');
};

beforeEach(freshDb);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const gif = () => {
  return new Blob(['GIF89a'], { type: 'image/gif' });
};

const planSticker = (id: string): ImportPlanSticker => {
  return { id, blob: gif(), width: 100, height: 100 };
};

/**
 * План, который несёт избранное и недавние: пак `tg:cats` со стикерами `tg:a` и `tg:b`, в избранном — ссылка на `tg:a`,
 * GIF и снимок удалённого пака, в недавних — `tg:b` и GIF.
 *
 * @returns план импорта
 */
const listsPlan = (): ImportPlan => {
  return {
    packs: [tgPack('cats', ['tg:a', 'tg:b'])],
    favorites: [
      { kind: 'sticker', id: 'tg:a', ts: 300 },
      { kind: 'gif', ts: 200, gif: remoteGif('fav') },
      {
        kind: 'sticker',
        id: 'tg:gone',
        ts: 100,
        packId: 'tg:old',
        sticker: { ...planSticker('tg:gone'), emoji: '🐱' },
      },
    ],
    recent: [
      { kind: 'sticker', id: 'tg:b', ts: 50 },
      { kind: 'gif', ts: 40, gif: remoteGif('sent') },
    ],
  };
};

const tgPack = (name: string, stickerIds: string[]): ImportPlanPack => {
  return {
    id: `tg:${name}`,
    source: 'telegram',
    title: `Файл ${name}`,
    sourceRef: name,
    stickers: stickerIds.map(planSticker),
  };
};

const libraryPack = (name: string): Pack => {
  return {
    id: `tg:${name}`,
    title: `Библиотека ${name}`,
    source: 'telegram',
    sourceRef: name,
    createdAt: 1000,
    usedAt: 2000,
    coverId: `${name}-1`,
  };
};

const librarySticker = (id: string, packId: string, createdAt: number): StickerRec => {
  return { id, packId, blob: gif(), width: 64, height: 64, emoji: '🙂', createdAt };
};

const byId = (a: Pick<Pack, 'id'>, b: Pick<Pack, 'id'>) => {
  return a.id.localeCompare(b.id);
};

const ids = (stickers: StickerRec[]) => {
  return stickers.map(({ id }) => {
    return id;
  });
};

/**
 * Всё, что лежит в библиотеке: паки и стикеры по id, без блобов, — сравнивается с тем, что было до импорта.
 *
 * @returns паки и стикеры библиотеки
 */
const snapshot = async () => {
  const packs = await db.listPacks();
  const byPack = await db.listAllStickers();
  const stickers = [...byPack.values()].reduce<StickerSnapshot[]>((acc, list) => {
    for (const { blob, ...rest } of list) acc.push({ ...rest, blobSize: blob.size });

    return acc;
  }, []);
  const favorites = (await db.listFavorites()).map((rec) => {
    return 'sticker' in rec
      ? { ...rec, sticker: { ...rec.sticker, blob: rec.sticker.blob.size } }
      : rec;
  });
  const recent = (await db.listAllRecent()).sort((a, b) => {
    return a.key.localeCompare(b.key);
  });

  return { packs: packs.sort(byId), stickers: stickers.sort(byId), favorites, recent };
};

const remoteGif = (id: string): RemoteGif & ManifestGif => {
  return {
    provider: 'giphy',
    id,
    title: id,
    url: `https://media.giphy.com/${id}.gif`,
    previewUrl: `https://media.giphy.com/${id}_s.gif`,
    width: 100,
    height: 80,
  };
};

/**
 * Часы, которые идут на 1 мс за вызов: записи недавних и избранного получают разное время.
 *
 * @param start — первое время
 */
const tickingClock = (start: number) => {
  let now = start;

  vi.spyOn(Date, 'now').mockImplementation(() => {
    now += 1;

    return now;
  });
};

/**
 * Сорок недавних стикеров — полный вид: следующий вытесняет самый старый.
 *
 * @returns ключи недавних от старых к новым
 */
const fillRecentStickers = async () => {
  const keys: string[] = [];

  for (let index = 0; index < 40; index++) {
    await db.pushRecent({ kind: 'local', stickerId: `tg:r${index}` });
    keys.push(`l:tg:r${index}`);
  }

  return keys;
};

/**
 * Итог записи без избранного и недавних.
 */
const NO_LISTS = {
  favoriteCount: 0,
  recentCount: 0,
  hasFavoriteStickers: false,
  hasRecentStickers: false,
};

const keysOf = (records: readonly (FavoriteRec | RecentRec)[]) => {
  return records.map(({ key }) => {
    return key;
  });
};

/**
 * Сбой на n-м вызове `put` за импорт: первые запросы записи уже выданы транзакции, и частичная запись была бы видна.
 * Функция, а не стрелка: подмене нужен `this` хранилища, чтобы прочие вызовы шли в настоящий `put`.
 *
 * @param n — номер вызова `put`, на котором сбой, с единицы
 * @param fail — что делает сбойный вызов с хранилищем
 */
const failOnPut = (n: number, fail: (store: IDBObjectStore) => never) => {
  const { put } = IDBObjectStore.prototype;
  let calls = 0;

  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function mockPut(
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore['put']>
  ) {
    calls += 1;
    if (calls === n) fail(this);

    return put.apply(this, args);
  });
};

describe('writeImport', () => {
  describe('атомарность', () => {
    it('put бросает посреди записи — импорт отклонён, библиотека как до него', async () => {
      await db.putPack(libraryPack('old'));
      await db.putSticker(librarySticker('old-1', 'tg:old', 1000));
      const before = await snapshot();
      const plan: ImportPlan = {
        packs: [tgPack('cats', ['c1', 'c2', 'c3']), tgPack('old', ['o2', 'o3'])],
        favorites: [],
        recent: [],
      };

      failOnPut(4, () => {
        throw new DOMException('сбой записи', 'DataCloneError');
      });

      await expect(db.writeImport(plan)).rejects.toBeDefined();
      vi.restoreAllMocks();
      expect(await snapshot()).toEqual(before);
    });

    it('транзакция обрывается посреди записи — импорт отклонён, библиотека как до него', async () => {
      await db.putSticker(librarySticker('own-1', 'custom', 1000));
      const before = await snapshot();
      const plan: ImportPlan = {
        packs: [tgPack('cats', ['c1', 'c2', 'c3'])],
        favorites: [],
        recent: [],
      };

      failOnPut(3, (store) => {
        store.transaction.abort();
        throw new DOMException('транзакция прервана', 'AbortError');
      });

      await expect(db.writeImport(plan)).rejects.toBeDefined();
      vi.restoreAllMocks();
      expect(await snapshot()).toEqual(before);
    });

    it('запрос записи падает — импорт отклонён ошибкой запроса, а не null, и её текст доходит до статуса', async () => {
      const plan: ImportPlan = {
        packs: [tgPack('cats', ['c1', 'c2', 'c3'])],
        favorites: [],
        recent: [],
      };
      const { add } = IDBObjectStore.prototype;
      let calls = 0;

      /**
       * Второй `add` той же записи падает `ConstraintError` на запросе: так ошибка приходит в `error` транзакции до её
       * `abort`, когда `tx.error` ещё `null`.
       */
      vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function mockPut(
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore['put']>
      ) {
        calls += 1;
        if (calls === 2) add.apply(this, args);

        return add.apply(this, args);
      });

      const error: unknown = await db.writeImport(plan).catch((reason: unknown) => {
        return reason;
      });

      expect(error).toBeInstanceOf(DOMException);
      expect(error).toMatchObject({ name: 'ConstraintError' });
      expect(fileImportFailure('write', error).message).not.toContain('null');
    });

    it('без сбоя тот же план записывается целиком', async () => {
      const plan: ImportPlan = {
        packs: [tgPack('cats', ['c1', 'c2', 'c3'])],
        favorites: [],
        recent: [],
      };

      expect(await db.writeImport(plan)).toEqual({
        packIds: ['tg:cats'],
        stickerCount: 3,
        ...NO_LISTS,
      });
      expect(ids(await db.listStickers('tg:cats'))).toEqual(['c1', 'c2', 'c3']);
    });
  });

  describe('занятый id', () => {
    it('стикер с занятым id пропускается, лежащий не меняется', async () => {
      await db.putPack(libraryPack('dogs'));
      const taken = librarySticker('shared', 'tg:dogs', 5000);

      await db.putSticker(taken);

      const written = await db.writeImport({
        packs: [tgPack('cats', ['c1', 'shared', 'c2'])],
        favorites: [],
        recent: [],
      });

      expect(written).toEqual({ packIds: ['tg:cats'], stickerCount: 2, ...NO_LISTS });
      expect(await db.getSticker('shared')).toEqual(taken);
      expect(ids(await db.listStickers('tg:cats'))).toEqual(['c1', 'c2']);
      expect(ids(await db.listStickers('tg:dogs'))).toEqual(['shared']);
    });

    it('новый пак, все стикеры которого заняты, не создаётся', async () => {
      await db.putPack(libraryPack('dogs'));
      await db.putSticker(librarySticker('d1', 'tg:dogs', 1000));
      await db.putSticker(librarySticker('d2', 'tg:dogs', 1001));

      const written = await db.writeImport({
        packs: [tgPack('cats', ['d1', 'd2'])],
        favorites: [],
        recent: [],
      });

      expect(written).toEqual({ packIds: [], stickerCount: 0, ...NO_LISTS });
      expect(await db.getPack('tg:cats')).toBeUndefined();
    });
  });

  describe('существующий пак', () => {
    it('стикеры встают в конец, после последнего стикера пака, а запись пака не перезаписывается', async () => {
      /**
       * Последний стикер пака новее часов импорта: время новых считается от него, а не от `Date.now`.
       */
      const now = 10_000;
      const pack = libraryPack('cats');

      vi.spyOn(Date, 'now').mockReturnValue(now);
      await db.putPack(pack);
      await db.putSticker(librarySticker('cats-1', 'tg:cats', 50_000));
      await db.putSticker(librarySticker('cats-2', 'tg:cats', 70_000));
      await db.putSticker(librarySticker('cats-3', 'tg:cats', 60_000));

      const written = await db.writeImport({
        packs: [tgPack('cats', ['n1', 'n2'])],
        favorites: [],
        recent: [],
      });
      const stickers = await db.listStickers('tg:cats');

      expect(written).toEqual({ packIds: ['tg:cats'], stickerCount: 2, ...NO_LISTS });
      expect(await db.getPack('tg:cats')).toEqual(pack);
      expect(
        stickers.map(({ id, createdAt }) => {
          return [id, createdAt];
        })
      ).toEqual([
        ['cats-1', 50_000],
        ['cats-3', 60_000],
        ['cats-2', 70_000],
        ['n1', 70_001],
        ['n2', 70_002],
      ]);
    });
  });

  describe('избранное и недавние', () => {
    it('перенос в пустую базу — избранное со снимками и недавние обоих видов', async () => {
      const written = await db.writeImport(listsPlan());
      const favorites = await db.listFavorites();
      const stickerA = await db.getSticker('tg:a');

      expect(written).toEqual({
        packIds: ['tg:cats'],
        stickerCount: 2,
        favoriteCount: 3,
        recentCount: 2,
        hasFavoriteStickers: true,
        hasRecentStickers: true,
      });
      expect(
        favorites.map((rec) => {
          return [rec.key, rec.ts];
        })
      ).toEqual([
        ['l:tg:a', 300],
        ['r:giphy:fav', 200],
        ['l:tg:gone', 100],
      ]);
      expect(favorites[0]).toMatchObject({ sticker: stickerA });
      expect(favorites[2]).toMatchObject({
        sticker: { id: 'tg:gone', packId: 'tg:old', emoji: '🐱', width: 100 },
      });
      expect(await db.getSticker('tg:gone')).toBeUndefined();
      expect(keysOf(await db.listRecent('sticker'))).toEqual(['l:tg:b']);
      expect(keysOf(await db.listRecent('gif'))).toEqual(['r:giphy:sent']);
    });

    it('повторная запись того же плана — без дублей, итог нулевой', async () => {
      await db.writeImport(listsPlan());
      const before = await snapshot();
      const written = await db.writeImport(listsPlan());

      expect(written).toEqual({ packIds: [], stickerCount: 0, ...NO_LISTS });
      expect(await snapshot()).toEqual(before);
    });

    it('избранное, которое уже есть, не меняется, а снимок лежащего стикера — его запись', async () => {
      await db.putPack(libraryPack('dogs'));
      const taken = librarySticker('tg:gone', 'tg:dogs', 5000);

      await db.putSticker(taken);
      tickingClock(1_000_000);
      const kept = await db.putFavorite({ kind: 'remote', gif: remoteGif('fav') });

      await db.writeImport(listsPlan());
      const favorites = await db.listFavorites();

      expect(
        favorites.find(({ key }) => {
          return key === 'r:giphy:fav';
        })
      ).toEqual(kept);
      expect(
        favorites.find(({ key }) => {
          return key === 'l:tg:gone';
        })
      ).toMatchObject({ ts: 100, sticker: taken });
    });

    it('избранное, которого нет в файле, остаётся с прежним временем', async () => {
      await db.putPack(libraryPack('dogs'));
      const mine = librarySticker('tg:mine', 'tg:dogs', 5000);

      await db.putSticker(mine);
      tickingClock(1_000_000);
      const keptGif = await db.putFavorite({ kind: 'remote', gif: remoteGif('mine') });
      const keptSticker = await db.putFavorite(
        { kind: 'local', stickerId: 'tg:mine' },
        mine
      );

      await db.writeImport(listsPlan());
      const favorites = await db.listFavorites();

      expect(
        favorites.find(({ key }) => {
          return key === 'r:giphy:mine';
        })
      ).toEqual(keptGif);
      expect(
        favorites.find(({ key }) => {
          return key === 'l:tg:mine';
        })
      ).toEqual(keptSticker);
      expect(favorites).toHaveLength(5);
    });

    it('лимит недавних — вытесненный ключ удаляется в базе', async () => {
      tickingClock(1000);
      const keys = await fillRecentStickers();

      await db.writeImport({
        packs: [tgPack('cats', ['tg:a'])],
        favorites: [],
        recent: [{ kind: 'sticker', id: 'tg:a', ts: 9_000_000 }],
      });
      const recent = await db.listRecent('sticker');

      expect(recent).toHaveLength(40);
      expect(recent[0]?.key).toBe('l:tg:a');
      expect(keysOf(recent)).not.toContain(keys[0]);
      expect(keysOf(recent)).toContain(keys[1]);
    });

    it('транзакция обрывается после записи избранного и недавних — оба хранилища как до импорта', async () => {
      tickingClock(1000);
      await fillRecentStickers();
      await db.putFavorite({ kind: 'remote', gif: remoteGif('mine') });
      const before = await snapshot();
      const { delete: remove } = IDBObjectStore.prototype;
      let puts = 0;
      const { put } = IDBObjectStore.prototype;

      vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function mockPut(
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore['put']>
      ) {
        puts += 1;

        return put.apply(this, args);
      });

      /**
       * Удаление ключей сверх лимита идёт последним: к нему выданы все записи паков, стикеров, избранного и недавних.
       */
      vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(function mockDelete(
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore['delete']>
      ) {
        if (this.name === 'recent') {
          this.transaction.abort();
          throw new DOMException('транзакция прервана', 'AbortError');
        }

        return remove.apply(this, args);
      });

      await expect(
        db.writeImport({
          ...listsPlan(),
          recent: [{ kind: 'sticker', id: 'tg:b', ts: 9_000_000 }],
        })
      ).rejects.toBeDefined();
      vi.restoreAllMocks();

      /**
       * Пак, два стикера, три записи избранного и запись недавних.
       */
      expect(puts).toBe(7);
      expect(await snapshot()).toEqual(before);
    });

    it('сбой на последней записи недавних — избранное и недавние как до импорта', async () => {
      const before = await snapshot();

      /**
       * Пак, два стикера, три записи избранного и две записи недавних: восьмая — последняя.
       */
      failOnPut(8, () => {
        throw new DOMException('сбой записи', 'DataCloneError');
      });

      await expect(db.writeImport(listsPlan())).rejects.toBeDefined();
      vi.restoreAllMocks();
      expect(await snapshot()).toEqual(before);
    });
  });

  describe('выгрузка и загрузка', () => {
    /**
     * Стикер с настоящим GIF: загрузка проверяет GIF файла.
     *
     * @param id — id стикера
     * @param packId — пак стикера
     * @param createdAt — время добавления
     * @returns запись стикера
     */
    const realSticker = (id: string, packId: string, createdAt: number): StickerRec => {
      return {
        ...librarySticker(id, packId, createdAt),
        blob: new Blob([makeGif(8, 9)], { type: 'image/gif' }),
        width: 8,
        height: 9,
      };
    };

    /**
     * Выгружает библиотеку и загружает файл в новую пустую базу, как другой браузер.
     *
     * @returns файл выгрузки, прочитанный уже в новой базе
     */
    const exportToFreshDb = async () => {
      const { blob } = await libraryFile.exportLibrary();

      await freshDb();
      const file = await libraryFile.readLibraryFile(blob);
      const card = await libraryFile.loadFileCard(file);

      await db.writeImport(await libraryFile.prepareImport(file, card));

      return file;
    };

    it('избранный стикер пака, снимок удалённого пака и GIF переносятся, повторная загрузка — всё уже в библиотеке', async () => {
      tickingClock(1000);
      await db.putPack(libraryPack('cats'));
      const c1 = realSticker('tg:c1', 'tg:cats', 10);
      const gone = { ...realSticker('tg:gone1', 'tg:gone', 20), caption: 'кот' };

      await db.putSticker(c1);
      await db.putSticker(realSticker('tg:c2', 'tg:cats', 11));
      await db.putFavorite({ kind: 'local', stickerId: 'tg:c1' }, c1);
      await db.putFavorite({ kind: 'local', stickerId: 'tg:gone1' }, gone);
      await db.putFavorite({ kind: 'remote', gif: remoteGif('fav') });
      await db.pushRecent({ kind: 'local', stickerId: 'tg:c2' });
      await db.pushRecent({ kind: 'remote', gif: remoteGif('sent') });
      const sourceFavorites = await db.listFavorites();
      const sourceRecent = await db.listAllRecent();

      const file = await exportToFreshDb();
      const favorites = await db.listFavorites();

      expect(
        favorites.map(({ key, ts }) => {
          return [key, ts];
        })
      ).toEqual(
        sourceFavorites.map(({ key, ts }) => {
          return [key, ts];
        })
      );
      expect(
        favorites.find(({ key }) => {
          return key === 'l:tg:c1';
        })
      ).toMatchObject({ sticker: await db.getSticker('tg:c1') });
      expect(
        favorites.find(({ key }) => {
          return key === 'l:tg:gone1';
        })
      ).toMatchObject({
        sticker: {
          id: 'tg:gone1',
          packId: 'tg:gone',
          caption: 'кот',
          width: 8,
          height: 9,
        },
      });
      expect(await db.getSticker('tg:gone1')).toBeUndefined();
      expect(
        favorites.find(({ key }) => {
          return key === 'r:giphy:fav';
        })
      ).toEqual(
        sourceFavorites.find(({ key }) => {
          return key === 'r:giphy:fav';
        })
      );
      expect(
        (await db.listAllRecent()).sort((a, b) => {
          return a.key.localeCompare(b.key);
        })
      ).toEqual(
        sourceRecent.sort((a, b) => {
          return a.key.localeCompare(b.key);
        })
      );

      const again = await libraryFile.loadFileCard(file);

      expect(libraryFile.hasFileCardAdds(again)).toBe(false);
    });
  });
});
