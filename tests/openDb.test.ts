import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Список хранилищ базы — из него открытие спрашивает только наличие.
 */
type FakeStoreNames = {
  /**
   * Есть ли хранилище в базе
   */
  contains: (name: string) => boolean;
};

/**
 * Созданное хранилище — открытие только добавляет ему индекс.
 */
type FakeStore = {
  /**
   * Создание индекса
   */
  createIndex: () => void;
};

/**
 * Соединение поддельной базы: хватает того, что трогает открытие, — список хранилищ, создание хранилища и индекса,
 * закрытие и обработчик `versionchange`.
 */
type FakeDb = {
  /**
   * Хранилища, уже лежащие в базе
   */
  objectStoreNames: FakeStoreNames;

  /**
   * Имена хранилищ, созданных обновлением
   */
  created: string[];

  /**
   * Создание хранилища — отдаёт объект с созданием индекса
   */
  createObjectStore: (name: string) => FakeStore;

  /**
   * Закрытие соединения
   */
  close: () => void;

  /**
   * Обработчик просьбы более новой версии отдать базу
   */
  onversionchange: (() => void) | null;
};

/**
 * Запрос открытия: тест сам зовёт его обработчики в нужном порядке.
 */
type FakeRequest = {
  /**
   * Соединение — у `upgradeneeded` и `success`
   */
  result: FakeDb;

  /**
   * Ошибка — у `error`
   */
  error: DOMException | null;

  /**
   * Обработчик обновления версии
   */
  onupgradeneeded: (() => void) | null;

  /**
   * Обработчик открытия
   */
  onsuccess: (() => void) | null;

  /**
   * Обработчик ошибки
   */
  onerror: (() => void) | null;

  /**
   * Обработчик блокировки другим соединением
   */
  onblocked: (() => void) | null;
};

/**
 * @param stores — хранилища, которые уже есть в базе
 * @returns поддельное соединение
 */
const fakeDb = (stores: string[] = []): FakeDb => {
  const db: FakeDb = {
    objectStoreNames: {
      contains: (name) => {
        return stores.includes(name);
      },
    },
    created: [],
    createObjectStore: (name) => {
      db.created.push(name);

      return { createIndex: vi.fn() };
    },
    close: vi.fn(),
    onversionchange: null,
  };

  return db;
};

let requests: FakeRequest[] = [];
let openDb: () => Promise<unknown>;

/**
 * @param index — номер запроса открытия
 * @returns запрос; его нет — тест упал раньше, чем дошёл до проверки
 */
const request = (index: number): FakeRequest => {
  const req = requests[index];

  if (!req) throw new Error(`Нет запроса открытия №${index}`);

  return req;
};

beforeEach(async () => {
  requests = [];
  vi.stubGlobal('indexedDB', {
    open: () => {
      const req: FakeRequest = {
        result: fakeDb(),
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };

      requests.push(req);

      return req;
    },
  });
  vi.resetModules();
  ({ openDb } = await import('@core/db'));
});

describe('openDb', () => {
  it('одновременные вызовы делят один запрос и получают одно соединение', async () => {
    const first = openDb();
    const second = openDb();

    request(0).onsuccess?.();

    expect(await first).toBe(request(0).result);
    expect(await second).toBe(request(0).result);
    expect(await openDb()).toBe(request(0).result);
    expect(requests).toHaveLength(1);
  });

  it('blocked — отказ ожидающим и следующим вызовам без нового запроса, success того же запроса — соединение', async () => {
    const first = openDb();
    const second = openDb();

    request(0).onblocked?.();

    await expect(first).rejects.toMatchObject({ key: 'error.db.blocked' });
    await expect(second).rejects.toMatchObject({ key: 'error.db.blocked' });
    await expect(openDb()).rejects.toMatchObject({ key: 'error.db.blocked' });
    await expect(openDb()).rejects.toMatchObject({ key: 'error.db.blocked' });
    expect(requests).toHaveLength(1);

    request(0).onsuccess?.();

    expect(await openDb()).toBe(request(0).result);
    expect(requests).toHaveLength(1);
  });

  it('VersionError — ошибка «обновился», следующий вызов делает новый запрос', async () => {
    const pending = openDb();

    request(0).error = new DOMException('newer', 'VersionError');
    request(0).onerror?.();

    await expect(pending).rejects.toMatchObject({ key: 'error.db.outdated' });

    const next = openDb();

    expect(requests).toHaveLength(2);
    request(1).onsuccess?.();
    expect(await next).toBe(request(1).result);
  });

  it('прочая ошибка открытия отдаётся как есть, состояние сбрасывается', async () => {
    const pending = openDb();
    const error = new DOMException('quota', 'QuotaExceededError');

    request(0).error = error;
    request(0).onerror?.();

    await expect(pending).rejects.toBe(error);

    const next = openDb();

    expect(requests).toHaveLength(2);
    request(1).onsuccess?.();
    await next;
  });

  it('versionchange — соединение закрывается, следующий вызов делает новый запрос', async () => {
    const pending = openDb();

    request(0).onsuccess?.();
    await pending;
    request(0).result.onversionchange?.();

    expect(request(0).result.close).toHaveBeenCalledOnce();

    const next = openDb();

    expect(requests).toHaveLength(2);
    request(1).error = new DOMException('newer', 'VersionError');
    request(1).onerror?.();
    await expect(next).rejects.toMatchObject({ key: 'error.db.outdated' });
  });

  it('обновление с версии 1 создаёт только хранилище избранного', async () => {
    const pending = openDb();
    const req = request(0);

    req.result = fakeDb(['packs', 'stickers', 'recent']);
    req.onupgradeneeded?.();
    req.onsuccess?.();
    await pending;

    expect(req.result.created).toEqual(['favorites']);
  });

  it('новая база получает все хранилища', async () => {
    const pending = openDb();
    const req = request(0);

    req.onupgradeneeded?.();
    req.onsuccess?.();
    await pending;

    expect(req.result.created).toEqual(['packs', 'stickers', 'recent', 'favorites']);
  });
});
