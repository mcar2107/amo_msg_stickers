import { LocalizedError, t } from './i18n/translate';
import {
  type FavoriteRec,
  isStickerFavorite,
  type Pack,
  type RecentKind,
  type RecentRec,
  type SendItem,
  type StickerRec,
  type StickersByPack,
} from './db.types';

export const CUSTOM_PACK_ID = 'custom';
const RECENT_LIMIT = 40;

const DB_NAME = 'amo-stickers';
const DB_VERSION = 2;

const STORE = {
  packs: 'packs',
  stickers: 'stickers',
  recent: 'recent',
  favorites: 'favorites',
} as const;

type StoreName = (typeof STORE)[keyof typeof STORE];

const PACK_ID_INDEX = 'packId';

/**
 * Начало ключа стикера библиотеки у недавних и избранного.
 */
const LOCAL_KEY_PREFIX = 'l:';

/**
 * Состояние открытия базы на вкладку. Запрос `indexedDB.open` один: запросы к базе стоят в общей очереди, и повтор
 * за заблокированным висел бы без событий.
 */
type OpenState =
  | {
      /**
       * Запроса нет: следующий вызов создаёт его
       */
      status: 'idle';
    }
  | {
      /**
       * Запрос идёт: вызовы ждут его исхода
       */
      status: 'pending';

      /**
       * Исход запроса
       */
      promise: Promise<IDBDatabase>;
    }
  | {
      /**
       * Запрос ждёт, пока вкладка прежней версии отпустит базу: вызовы сразу отклоняются, а его `success` позже
       * откроет базу без нового запроса
       */
      status: 'blocked';
    }
  | {
      /**
       * Соединение открыто
       */
      status: 'open';

      /**
       * Соединение
       */
      db: IDBDatabase;
    };

let openState: OpenState = { status: 'idle' };

/**
 * Хранилища создаются по отсутствию, а не по прежней версии: одна ветка служит и новой базе, и обновлению с любой
 * прежней, и записи уже лежащих хранилищ не трогаются.
 *
 * @param db — база в транзакции обновления версии
 */
const createStores = (db: IDBDatabase) => {
  const { objectStoreNames } = db;

  if (!objectStoreNames.contains(STORE.packs)) {
    db.createObjectStore(STORE.packs, { keyPath: 'id' });
  }

  if (!objectStoreNames.contains(STORE.stickers)) {
    db.createObjectStore(STORE.stickers, { keyPath: 'id' }).createIndex(
      PACK_ID_INDEX,
      'packId'
    );
  }

  if (!objectStoreNames.contains(STORE.recent)) {
    db.createObjectStore(STORE.recent, { keyPath: 'key' });
  }

  if (!objectStoreNames.contains(STORE.favorites)) {
    db.createObjectStore(STORE.favorites, { keyPath: 'key' });
  }
};

/**
 * @param error — ошибка запроса открытия
 * @returns `VersionError` (базу уже обновила более новая версия из другой вкладки) — ошибка с просьбой перезагрузить
 * вкладку, иначе ошибка как есть
 */
const openError = (error: DOMException | null): Error => {
  if (error?.name === 'VersionError') return new LocalizedError('error.db.outdated');

  return error || new Error('IndexedDB open failed');
};

/**
 * @returns исход нового запроса открытия
 */
const requestDb = (): Promise<IDBDatabase> => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);

  return new Promise((resolve, reject) => {
    req.onupgradeneeded = () => {
      createStores(req.result);
    };

    req.onblocked = () => {
      openState = { status: 'blocked' };
      reject(new LocalizedError('error.db.blocked'));
    };

    req.onsuccess = () => {
      const db = req.result;

      /**
       * Более новая версия просит базу: соединение отпускается, чтобы не мешать её обновлению, а следующее открытие
       * этой вкладки получит `VersionError` и попросит перезагрузить вкладку.
       */
      db.onversionchange = () => {
        db.close();

        if (openState.status === 'open' && openState.db === db) {
          openState = { status: 'idle' };
        }
      };

      openState = { status: 'open', db };
      resolve(db);
    };

    req.onerror = () => {
      openState = { status: 'idle' };
      reject(openError(req.error));
    };
  });
};

/**
 * Одно соединение на вкладку.
 *
 * @returns соединение; отклоняется `error.db.blocked`, пока вкладка прежней версии держит базу, — на каждом вызове,
 * без нового запроса, — и `error.db.outdated`, если базу уже обновила более новая версия
 */
export const openDb = async (): Promise<IDBDatabase> => {
  switch (openState.status) {
    case 'idle': {
      const promise = requestDb();

      openState = { status: 'pending', promise };

      return promise;
    }

    case 'pending': {
      return openState.promise;
    }

    case 'blocked': {
      throw new LocalizedError('error.db.blocked');
    }

    case 'open': {
      return openState.db;
    }

    default: {
      const unknownState: never = openState;

      throw new Error(`Unknown open state: ${JSON.stringify(unknownState)}`);
    }
  }
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
 * Причина отказа транзакции. Прерванная транзакция может не нести ошибки (`tx.error` — `null`), и строка статуса
 * показала бы «null»: тогда причина — ошибка словаря на языке интерфейса.
 *
 * @param error — ошибка транзакции
 * @returns ошибка для отклонения промиса
 */
export const transactionError = (error: DOMException | null): Error => {
  return error || new LocalizedError('error.db.aborted');
};

/**
 * Ждёт `abort` наравне с `error`: транзакция, прерванная без ошибки запроса (сбой коммита по квоте), иначе оставила
 * бы промис неразрешённым навсегда.
 *
 * @param tx — транзакция IndexedDB
 * @returns завершение транзакции; отклоняется `transactionError` при сбое или прерывании
 */
const txDone = (tx: IDBTransaction): Promise<void> => {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      return resolve();
    };

    tx.onerror = () => {
      return reject(transactionError(tx.error));
    };

    tx.onabort = () => {
      return reject(transactionError(tx.error));
    };
  });
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

export const ensureCustomPack = async (): Promise<Pack> => {
  const existing = await getPack(CUSTOM_PACK_ID);

  if (existing) return existing;
  const pack: Pack = {
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

export const getSticker = async (id: string): Promise<StickerRec | undefined> => {
  return promisify<StickerRec | undefined>((await store(STORE.stickers)).get(id));
};

export const putSticker = async (sticker: StickerRec) => {
  await promisify((await store(STORE.stickers, 'readwrite')).put(sticker));
};

export const deleteSticker = async (id: string) => {
  await promisify((await store(STORE.stickers, 'readwrite')).delete(id));
};

/**
 * Один ключ на элемент у недавних и избранного: «в избранном ли» узнаётся у любой ячейки по её элементу.
 *
 * @param item — элемент
 * @returns `l:<id стикера>` у стикера библиотеки, `r:<источник>:<id>` у GIF из поиска
 */
export const itemKey = (item: SendItem): string => {
  switch (item.kind) {
    case 'local': {
      return `${LOCAL_KEY_PREFIX}${item.stickerId}`;
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
  const rec: RecentRec = { key: itemKey(item), ts: Date.now(), item };

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
  await promisify((await store(STORE.recent, 'readwrite')).delete(itemKey(item)));
};

/**
 * @param item — элемент
 * @param sticker — снимок записи стикера; обязателен у стикера библиотеки
 * @param ts — время добавления (мс)
 * @returns запись избранного
 */
export const favoriteRecord = (
  item: SendItem,
  sticker: StickerRec | undefined,
  ts: number
): FavoriteRec => {
  const key = itemKey(item);

  switch (item.kind) {
    case 'local': {
      if (!sticker) throw new Error(`Favorite sticker without snapshot: ${key}`);

      return { key, ts, item, sticker };
    }

    case 'remote': {
      return { key, ts, item };
    }

    default: {
      const unknownItem: never = item;

      throw new Error(`Unknown send item: ${JSON.stringify(unknownItem)}`);
    }
  }
};

/**
 * @param records — записи избранного в любом порядке
 * @returns новый список от новых к старым
 */
export const favoritesNewestFirst = (records: FavoriteRec[]): FavoriteRec[] => {
  return [...records].sort((a, b) => {
    return b.ts - a.ts;
  });
};

export const listFavorites = async (): Promise<FavoriteRec[]> => {
  return favoritesNewestFirst(
    await promisify<FavoriteRec[]>((await store(STORE.favorites)).getAll())
  );
};

/**
 * Запись по ключу: повторное добавление, выбранное по устаревшему состоянию из другой вкладки, не дублирует элемент.
 *
 * Промис ждёт коммита транзакции, а не успеха запроса: сорванный коммит иначе показал бы «Добавлено в избранное».
 *
 * @param item — элемент
 * @param sticker — снимок записи стикера; обязателен у стикера библиотеки
 * @returns записанная запись — та же, что увидит следующее чтение; отклоняется при сбое или прерывании транзакции
 */
export const putFavorite = async (
  item: SendItem,
  sticker?: StickerRec
): Promise<FavoriteRec> => {
  const rec = favoriteRecord(item, sticker, Date.now());
  const db = await openDb();
  const tx = db.transaction(STORE.favorites, 'readwrite');

  tx.objectStore(STORE.favorites).put(rec);
  await txDone(tx);

  return rec;
};

/**
 * Удаление по ключу: элемента, уже убранного в другой вкладке, нет — промис выполняется без ошибки.
 *
 * @param item — элемент
 * @returns завершение записи; отклоняется при сбое или прерывании транзакции
 */
export const deleteFavorite = async (item: SendItem) => {
  const db = await openDb();
  const tx = db.transaction(STORE.favorites, 'readwrite');

  tx.objectStore(STORE.favorites).delete(itemKey(item));
  await txDone(tx);
};

/**
 * @param stickerId — id стикера библиотеки
 * @returns снимок записи избранного стикера; стикер не в избранном — undefined
 */
export const getFavoriteSticker = async (
  stickerId: string
): Promise<StickerRec | undefined> => {
  const rec = await promisify<FavoriteRec | undefined>(
    (await store(STORE.favorites)).get(itemKey({ kind: 'local', stickerId }))
  );

  return rec && isStickerFavorite(rec) ? rec.sticker : undefined;
};

/**
 * Считает по диапазону ключей, а не чтением записей: снимки стикеров не достаются из базы ради числа.
 *
 * @returns число избранных стикеров библиотеки, без GIF
 */
export const countFavoriteStickers = async (): Promise<number> => {
  /**
   * `;` — следующий за `:` символ: диапазон берёт все ключи, начинающиеся с префикса.
   */
  const range = IDBKeyRange.bound(LOCAL_KEY_PREFIX, 'l;', false, true);

  return promisify<number>((await store(STORE.favorites)).count(range));
};
