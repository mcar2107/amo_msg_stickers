import { t } from './i18n/translate';
import { buildImportRecords } from './libraryFile/importRecords';
import type { ImportLibrary, ImportWritten } from './libraryFile/importRecords.types';
import type { ImportPlan } from './libraryFile/prepareImport.types';
import type {
  Pack,
  RecentKind,
  RecentRec,
  SendItem,
  StickerRec,
  StickersByPack,
} from './db.types';

export const CUSTOM_PACK_ID = 'custom';
const RECENT_LIMIT = 40;

const DB_NAME = 'amo-stickers';
const DB_VERSION = 1;

const STORE = {
  packs: 'packs',
  stickers: 'stickers',
  recent: 'recent',
} as const;

type StoreName = (typeof STORE)[keyof typeof STORE];

const PACK_ID_INDEX = 'packId';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      db.createObjectStore(STORE.packs, { keyPath: 'id' });
      const stickers = db.createObjectStore(STORE.stickers, { keyPath: 'id' });

      stickers.createIndex(PACK_ID_INDEX, 'packId');
      db.createObjectStore(STORE.recent, { keyPath: 'key' });
    };

    req.onsuccess = () => {
      return resolve(req.result);
    };

    req.onerror = () => {
      return reject(req.error);
    };
  });

  return dbPromise;
};

/**
 * IndexedDB отдаёт записи нетипизированными (`any`), поэтому тип результата задаёт
 * вызывающая сторона. Гарантия типа — только в том, что в хранилища пишут лишь
 * put-функции этого модуля.
 *
 * @param req — запрос IndexedDB
 * @returns результат запроса
 */
const promisify = <T>(req: IDBRequest): Promise<T> => {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      return resolve(req.result as T);
    };

    req.onerror = () => {
      return reject(req.error);
    };
  });
};

/**
 * Ждёт `abort` наравне с `error`: транзакция, прерванная без ошибки запроса (сбой коммита по квоте), иначе оставила
 * бы промис неразрешённым навсегда.
 *
 * На `error` причина берётся из упавшего запроса, а не из транзакции: `tx.error` в этот момент ещё `null`, транзакция
 * получает ошибку только при следующем за ним `abort`. Прерывание без ошибки (`abort()` вызван руками) отклоняет
 * промис `AbortError`, а не `null`: по причине отказа импорт выбирает текст ошибки.
 *
 * @param tx — транзакция IndexedDB
 * @returns завершение транзакции; отклоняется ошибкой упавшего запроса или транзакции при сбое или прерывании
 */
const txDone = (tx: IDBTransaction): Promise<void> => {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      return resolve();
    };

    tx.onerror = (event) => {
      const { target } = event;
      const requestError = target instanceof IDBRequest ? target.error : null;

      return reject(requestError || tx.error || abortError());
    };

    tx.onabort = () => {
      return reject(tx.error || abortError());
    };
  });
};

/**
 * Причина прерывания транзакции, у которой нет своей ошибки.
 *
 * @returns `DOMException` вида `AbortError`
 */
const abortError = () => {
  return new DOMException(t('error.db.aborted'), 'AbortError');
};

const store = async (name: StoreName, mode: IDBTransactionMode = 'readonly') => {
  const db = await openDb();

  return db.transaction(name, mode).objectStore(name);
};

/**
 * Случайная часть — 8 символов base36 после `0.`, временная метка отсекает
 * коллизии между сессиями.
 */
export const uid = () => {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
};

export const listPacks = async (): Promise<Pack[]> => {
  const packs = await promisify<Pack[]>((await store(STORE.packs)).getAll());

  return packs.sort((a, b) => {
    return a.createdAt - b.createdAt;
  });
};

export const getPack = async (id: string): Promise<Pack | undefined> => {
  return promisify<Pack | undefined>((await store(STORE.packs)).get(id));
};

export const putPack = async (pack: Pack) => {
  await promisify((await store(STORE.packs, 'readwrite')).put(pack));
};

/**
 * Отмечает использование пака текущим временем. Чтение и запись — одна транзакция: запись пака, которую другая вкладка
 * сделала между ними (повторный импорт), не затирается прежней копией.
 *
 * @param packId — id пака
 * @returns завершение записи; пака нет (удалён в другой вкладке) — ничего не пишется, промис выполняется без ошибки
 */
export const touchPack = async (packId: string) => {
  const db = await openDb();
  const tx = db.transaction(STORE.packs, 'readwrite');
  const packs = tx.objectStore(STORE.packs);
  const req = packs.get(packId);

  req.onsuccess = () => {
    const pack = req.result as Pack | undefined;

    if (pack) packs.put({ ...pack, usedAt: Date.now() });
  };

  await txDone(tx);
};

/**
 * Ставит паку обложку. Чтение и запись — одна транзакция: отметка использования, сделанная во время импорта, не
 * затирается копией записи, которую импорт держит с начала.
 *
 * @param packId — id пака
 * @param coverId — id стикера-обложки
 * @returns завершение записи; пака нет — ничего не пишется, промис выполняется без ошибки
 */
export const setPackCover = async (packId: string, coverId: string) => {
  const db = await openDb();
  const tx = db.transaction(STORE.packs, 'readwrite');
  const packs = tx.objectStore(STORE.packs);
  const req = packs.get(packId);

  req.onsuccess = () => {
    const pack = req.result as Pack | undefined;

    if (pack) packs.put({ ...pack, coverId });
  };

  await txDone(tx);
};

/**
 * Одна запись своего пака и для пикера, и для импорта файла: «Мои стикеры» не зависят от того, кто их создал.
 *
 * @returns запись своего пака
 */
const customPackRecord = (): Pack => {
  return {
    id: CUSTOM_PACK_ID,
    /**
     * Название на языке создания; в интерфейсе свой пак называется по id, на текущем языке (`packTitle`).
     */
    title: t('pack.custom'),
    source: 'custom',
    /**
     * 0 — вкладка своих стикеров всегда первая среди наборов.
     */
    createdAt: 0,
  };
};

export const ensureCustomPack = async (): Promise<Pack> => {
  const existing = await getPack(CUSTOM_PACK_ID);

  if (existing) return existing;
  const pack = customPackRecord();

  await putPack(pack);

  return pack;
};

/**
 * Стикеры одного пака в порядке добавления.
 *
 * @param packId — id пака
 * @returns записи стикеров пака; у пака без стикеров — пустой список
 */
export const listStickers = async (packId: string): Promise<StickerRec[]> => {
  const index = (await store(STORE.stickers)).index(PACK_ID_INDEX);
  const stickers = await promisify<StickerRec[]>(index.getAll(packId));

  return stickers.sort((a, b) => {
    return a.createdAt - b.createdAt;
  });
};

/**
 * Сортировка до группировки: порядок внутри пака задаётся одним проходом по всей библиотеке.
 *
 * @param stickers — стикеры в любом порядке
 * @returns стикеры по пакам; пака без стикеров в группировке нет
 */
export const groupStickers = (stickers: StickerRec[]): StickersByPack => {
  const sorted = [...stickers].sort((a, b) => {
    return a.createdAt - b.createdAt;
  });

  return sorted.reduce<StickersByPack>((groups, sticker) => {
    const group = groups.get(sticker.packId);

    if (group) group.push(sticker);
    else groups.set(sticker.packId, [sticker]);

    return groups;
  }, new Map());
};

/**
 * Одно чтение хранилища на всю ленту: записи держат ссылки на блобы, а не их содержимое.
 */
export const listAllStickers = async (): Promise<StickersByPack> => {
  return groupStickers(
    await promisify<StickerRec[]>((await store(STORE.stickers)).getAll())
  );
};

/**
 * Ключи хранилища — строки: записи в него кладут только put-функции этого модуля, и `id` у них строкой.
 *
 * @param keys — ключи из `getAllKeys`
 * @returns строковые ключи
 */
const stringKeys = (keys: IDBValidKey[]): string[] => {
  return keys.reduce<string[]>((acc, key) => {
    if (typeof key === 'string') acc.push(key);

    return acc;
  }, []);
};

/**
 * Id всех стикеров без чтения записей: сверке с файлом блобы не нужны.
 *
 * @returns id стикеров библиотеки в любом порядке
 */
export const listStickerIds = async (): Promise<string[]> => {
  return stringKeys(
    await promisify<IDBValidKey[]>((await store(STORE.stickers)).getAllKeys())
  );
};

export const countStickers = async (): Promise<number> => {
  return promisify<number>((await store(STORE.stickers)).count());
};

export const deletePack = async (packId: string) => {
  const stickers = await listStickers(packId);
  const db = await openDb();
  const tx = db.transaction([STORE.packs, STORE.stickers], 'readwrite');

  tx.objectStore(STORE.packs).delete(packId);
  for (const { id } of stickers) tx.objectStore(STORE.stickers).delete(id);
  await txDone(tx);
};

/**
 * Записывает импорт из файла одной транзакцией: сверка с библиотекой и запись идут в колбэках её запросов, без
 * ожидания чего-либо вне базы, — иначе транзакция закоммитилась бы между чтением и записью. Поэтому библиотека сверяется
 * в момент записи, а сбой (квота, закрытие вкладки) оставляет её как до импорта. Отменить запись нельзя: выданные
 * запросы коммитятся.
 *
 * @param plan — проверенный план импорта
 * @returns что записано на самом деле: паки, в которые добавлены стикеры, и число стикеров; отклоняется ошибкой
 * упавшего запроса или транзакции при сбое или прерывании
 */
export const writeImport = async (plan: ImportPlan): Promise<ImportWritten> => {
  const db = await openDb();
  const startedAt = Date.now();
  const customPack = customPackRecord();
  const tx = db.transaction([STORE.packs, STORE.stickers], 'readwrite');
  const packs = tx.objectStore(STORE.packs);
  const stickers = tx.objectStore(STORE.stickers);
  const library: ImportLibrary = {
    packIds: new Set(),
    stickerIds: new Set(),
    lastStickerAt: new Map(),
  };
  let written: ImportWritten = { packIds: [], stickerCount: 0 };
  let pendingReads = 2 + plan.packs.length;

  /**
   * Записи строятся по последнему прочитанному: до него состояние библиотеки неполное.
   */
  const handleRead = () => {
    pendingReads -= 1;
    if (pendingReads) return;
    const records = buildImportRecords(plan, library, { startedAt, customPack });

    for (const pack of records.packs) packs.put(pack);
    for (const sticker of records.stickers) stickers.put(sticker);
    ({ written } = records);
  };

  const packKeys = packs.getAllKeys();

  packKeys.onsuccess = () => {
    for (const id of stringKeys(packKeys.result)) library.packIds.add(id);
    handleRead();
  };

  const stickerKeys = stickers.getAllKeys();

  stickerKeys.onsuccess = () => {
    for (const id of stringKeys(stickerKeys.result)) library.stickerIds.add(id);
    handleRead();
  };

  for (const { id: packId } of plan.packs) {
    const packStickers = stickers.index(PACK_ID_INDEX).getAll(packId);

    packStickers.onsuccess = () => {
      /**
       * Каст — как у `promisify`: в хранилище стикеров пишут только put-функции этого модуля.
       */
      for (const { createdAt } of packStickers.result as StickerRec[]) {
        const last = library.lastStickerAt.get(packId);

        if (last === undefined || createdAt > last)
          library.lastStickerAt.set(packId, createdAt);
      }

      handleRead();
    };
  }

  await txDone(tx);

  return written;
};

export const getSticker = async (id: string): Promise<StickerRec | undefined> => {
  return promisify<StickerRec | undefined>((await store(STORE.stickers)).get(id));
};

export const putSticker = async (sticker: StickerRec) => {
  await promisify((await store(STORE.stickers, 'readwrite')).put(sticker));
};

export const deleteSticker = async (id: string) => {
  await promisify((await store(STORE.stickers, 'readwrite')).delete(id));
};

const recentKey = (item: SendItem): string => {
  switch (item.kind) {
    case 'local': {
      return `l:${item.stickerId}`;
    }

    case 'remote': {
      return `r:${item.gif.provider}:${item.gif.id}`;
    }

    default: {
      const unknownItem: never = item;

      throw new Error(`Unknown send item: ${JSON.stringify(unknownItem)}`);
    }
  }
};

/**
 * Вид выводится из самого элемента, а не хранится отдельным полем: записи, сохранённые до
 * разделения недавних, попадают каждая в свой вид без миграции базы.
 *
 * @param item — отправленный элемент
 * @returns вид недавних
 */
export const recentKindOf = (item: SendItem): RecentKind => {
  switch (item.kind) {
    case 'local': {
      return 'sticker';
    }

    case 'remote': {
      return 'gif';
    }

    default: {
      const unknownItem: never = item;

      throw new Error(`Unknown send item: ${JSON.stringify(unknownItem)}`);
    }
  }
};

/**
 * @param records — записи недавних в любом порядке
 * @param kind — вид недавних
 * @returns записи этого вида от новых к старым
 */
export const recentOfKind = (records: RecentRec[], kind: RecentKind): RecentRec[] => {
  const ofKind = records.reduce<RecentRec[]>((acc, rec) => {
    if (recentKindOf(rec.item) === kind) acc.push(rec);

    return acc;
  }, []);

  return ofKind.sort((a, b) => {
    return b.ts - a.ts;
  });
};

/**
 * Лимит считается по виду: поток отправленных GIF не вытесняет стикеры, и наоборот.
 *
 * @param records — все записи недавних
 * @param kind — вид, в который только что добавлена запись
 * @returns ключи самых старых записей этого вида сверх лимита
 */
export const recentOverflow = (records: RecentRec[], kind: RecentKind): string[] => {
  return recentOfKind(records, kind).reduce<string[]>((acc, { key }, index) => {
    if (index >= RECENT_LIMIT) acc.push(key);

    return acc;
  }, []);
};

/**
 * @param keys — ключи записей недавних
 */
const deleteRecentKeys = async (keys: string[]) => {
  if (!keys.length) return;
  const recent = await store(STORE.recent, 'readwrite');

  for (const key of keys) recent.delete(key);
};

export const pushRecent = async (item: SendItem) => {
  const recent = await store(STORE.recent, 'readwrite');
  const rec: RecentRec = { key: recentKey(item), ts: Date.now(), item };

  await promisify(recent.put(rec));
  const all = await promisify<RecentRec[]>(recent.getAll());

  await deleteRecentKeys(recentOverflow(all, recentKindOf(item)));
};

export const listRecent = async (kind: RecentKind): Promise<RecentRec[]> => {
  const all = await promisify<RecentRec[]>((await store(STORE.recent)).getAll());

  return recentOfKind(all, kind);
};

export const clearRecent = async (kind: RecentKind) => {
  const all = await promisify<RecentRec[]>((await store(STORE.recent)).getAll());

  const keys = all.reduce<string[]>((acc, { key, item }) => {
    if (recentKindOf(item) === kind) acc.push(key);

    return acc;
  }, []);

  await deleteRecentKeys(keys);
};

export const deleteRecent = async (item: SendItem) => {
  await promisify((await store(STORE.recent, 'readwrite')).delete(recentKey(item)));
};
