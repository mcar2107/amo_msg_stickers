import { IDBFactory, IDBObjectStore, IDBRequest } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Pack, StickerRec } from '@core/db.types';
import type { ImportPlan, ImportPlanPack, ImportPlanSticker } from '@core/libraryFile';
import { fileImportFailure } from '@ui/PickerProvider/fileImportOutcome';

type Db = typeof import('@core/db');

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

beforeEach(async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBRequest', IDBRequest);
  vi.resetModules();
  db = await import('@core/db');
});

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

  return { packs: packs.sort(byId), stickers: stickers.sort(byId) };
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

      expect(written).toEqual({ packIds: ['tg:cats'], stickerCount: 2 });
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

      expect(written).toEqual({ packIds: [], stickerCount: 0 });
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

      expect(written).toEqual({ packIds: ['tg:cats'], stickerCount: 2 });
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
});
