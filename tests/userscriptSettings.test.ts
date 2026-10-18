import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@core/host';
import { gmSettings, localStorageSettings, SETTINGS_KEY } from '@userscript/settings';
import type { GmStore, SettingsStorage } from '@userscript/settings.types';

/**
 * Фейковый `localStorage`: строки в `Map`, каждый метод — шпион.
 *
 * @param initial — ключи и значения до теста
 * @returns хранилище и его содержимое
 */
const fakeStorage = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial));
  const storage = {
    getItem: vi.fn((key: string) => {
      return items.get(key) || null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      items.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      items.delete(key);
    }),
  } satisfies SettingsStorage;

  return { storage, items };
};

/**
 * Фейковое хранилище менеджера: значения как есть, без сериализации.
 *
 * @param initial — ключи и значения до теста
 * @returns хранилище и его содержимое
 */
const fakeGmStore = (initial: Record<string, unknown> = {}) => {
  const values = new Map(Object.entries(initial));
  const gmStore = {
    getValue: vi.fn((key: string, defaultValue?: unknown) => {
      return values.has(key) ? values.get(key) : defaultValue;
    }),
    setValue: vi.fn((key: string, value: unknown) => {
      values.set(key, value);
    }),
  } satisfies GmStore;

  return { gmStore, values };
};

describe('gmSettings: перенос из localStorage', () => {
  it('менеджер пуст — настройки переносятся объектом, ключ из storage удалён', async () => {
    const { storage, items } = fakeStorage({
      [SETTINGS_KEY]: JSON.stringify({ giphyKey: 'g', telegramToken: 't' }),
    });
    const { gmStore, values } = fakeGmStore();

    const settings = await gmSettings(gmStore, storage).getSettings();

    expect(settings).toEqual({ ...DEFAULT_SETTINGS, giphyKey: 'g', telegramToken: 't' });
    expect(values.get(SETTINGS_KEY)).toEqual({ giphyKey: 'g', telegramToken: 't' });
    expect(typeof values.get(SETTINGS_KEY)).toBe('object');
    expect(items.has(SETTINGS_KEY)).toBe(false);
  });

  it('null из менеджера — хранилище пусто, настройки переносятся', async () => {
    const { storage, items } = fakeStorage({
      [SETTINGS_KEY]: JSON.stringify({ klipyKey: 'k' }),
    });
    const { gmStore, values } = fakeGmStore({ [SETTINGS_KEY]: null });

    const settings = await gmSettings(gmStore, storage).getSettings();

    expect(settings.klipyKey).toBe('k');
    expect(values.get(SETTINGS_KEY)).toEqual({ klipyKey: 'k' });
    expect(items.has(SETTINGS_KEY)).toBe(false);
  });

  it('после переноса storage больше не читается', async () => {
    const { storage } = fakeStorage({
      [SETTINGS_KEY]: JSON.stringify({ klipyKey: 'k' }),
    });
    const { gmStore } = fakeGmStore();
    const settings = gmSettings(gmStore, storage);

    await settings.getSettings();
    const second = await settings.getSettings();

    expect(second.klipyKey).toBe('k');
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it('битый JSON удаляется без переноса и даёт настройки по умолчанию', async () => {
    const { storage, items } = fakeStorage({ [SETTINGS_KEY]: '{oops' });
    const { gmStore } = fakeGmStore();

    const settings = await gmSettings(gmStore, storage).getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(items.has(SETTINGS_KEY)).toBe(false);
    expect(gmStore.setValue).not.toHaveBeenCalled();
  });

  it('в storage не объект — удаляется без переноса', async () => {
    const { storage, items } = fakeStorage({ [SETTINGS_KEY]: '"строка"' });
    const { gmStore } = fakeGmStore();

    const settings = await gmSettings(gmStore, storage).getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(items.has(SETTINGS_KEY)).toBe(false);
    expect(gmStore.setValue).not.toHaveBeenCalled();
  });

  it('пусто везде — настройки по умолчанию, ничего не пишется', async () => {
    const { storage } = fakeStorage();
    const { gmStore } = fakeGmStore();

    const settings = await gmSettings(gmStore, storage).getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(gmStore.setValue).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});

describe('gmSettings: хранилище менеджера', () => {
  it('значение менеджера важнее storage, storage не трогается', async () => {
    const legacy = JSON.stringify({ giphyKey: 'ls' });
    const { storage, items } = fakeStorage({ [SETTINGS_KEY]: legacy });
    const { gmStore } = fakeGmStore({ [SETTINGS_KEY]: { giphyKey: 'gm' } });

    const settings = await gmSettings(gmStore, storage).getSettings();

    expect(settings).toEqual({ ...DEFAULT_SETTINGS, giphyKey: 'gm' });
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(items.get(SETTINGS_KEY)).toBe(legacy);
  });

  it('поля не-строки из менеджера заменяются значениями по умолчанию', async () => {
    const { storage } = fakeStorage();
    const { gmStore } = fakeGmStore({
      [SETTINGS_KEY]: { giphyKey: 42, klipyKey: 'k' },
    });

    const settings = await gmSettings(gmStore, storage).getSettings();

    expect(settings).toEqual({ ...DEFAULT_SETTINGS, klipyKey: 'k' });
  });

  it('запись идёт только в менеджер, объектом', async () => {
    const { storage, items } = fakeStorage();
    const { gmStore, values } = fakeGmStore();

    await gmSettings(gmStore, storage).setSettings({ telegramToken: 't' });

    expect(values.get(SETTINGS_KEY)).toEqual({ ...DEFAULT_SETTINGS, telegramToken: 't' });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(items.size).toBe(0);
  });

  it('setSettings сливает патч с текущими настройками, чужие поля целы', async () => {
    const { storage } = fakeStorage();
    const { gmStore, values } = fakeGmStore({
      [SETTINGS_KEY]: { giphyKey: 'g', klipyKey: 'k' },
    });
    const settings = gmSettings(gmStore, storage);

    await settings.setSettings({ klipyKey: 'k2' });

    expect(values.get(SETTINGS_KEY)).toEqual({
      giphyKey: 'g',
      klipyKey: 'k2',
      telegramToken: '',
    });
    expect(await settings.getSettings()).toEqual({
      giphyKey: 'g',
      klipyKey: 'k2',
      telegramToken: '',
    });
  });
});

describe('localStorageSettings', () => {
  it('читает storage и дополняет пропуски значениями по умолчанию', async () => {
    const { storage } = fakeStorage({
      [SETTINGS_KEY]: JSON.stringify({ giphyKey: 'g' }),
    });

    const settings = await localStorageSettings(storage).getSettings();

    expect(settings).toEqual({ ...DEFAULT_SETTINGS, giphyKey: 'g' });
  });

  it('битый JSON — настройки по умолчанию', async () => {
    const { storage } = fakeStorage({ [SETTINGS_KEY]: '{oops' });

    const settings = await localStorageSettings(storage).getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('setSettings пишет в storage JSON-строку со слитым патчем', async () => {
    const { storage, items } = fakeStorage({
      [SETTINGS_KEY]: JSON.stringify({ giphyKey: 'g' }),
    });

    await localStorageSettings(storage).setSettings({ telegramToken: 't' });

    expect(JSON.parse(items.get(SETTINGS_KEY) || '')).toEqual({
      ...DEFAULT_SETTINGS,
      giphyKey: 'g',
      telegramToken: 't',
    });
  });
});
