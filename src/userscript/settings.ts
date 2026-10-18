import { DEFAULT_SETTINGS, pickSettings } from '@core/host';
import type { HostSettings, Settings } from '@core/host.types';
import { isObject } from '@shared/guards';

import type { GmStore, SettingsStorage } from './settings.types';

/**
 * Ключ настроек — один и тот же в хранилище менеджера и в `localStorage`: по нему перенос
 * находит настройки, сохранённые без менеджера.
 */
export const SETTINGS_KEY = 'amo-stickers:settings';

/**
 * Разбор JSON настроек из `localStorage`.
 *
 * @param raw — строка из хранилища
 * @returns сохранённые поля; null — JSON битый или в нём не объект
 */
const parseStored = (raw: string): Partial<Settings> | null => {
  try {
    const parsed: unknown = JSON.parse(raw);

    return isObject(parsed) ? pickSettings(parsed) : null;
  } catch {
    return null;
  }
};

/**
 * Запись настроек — всегда полный объект: патч сливается с текущими настройками, чтобы
 * сохранение одного ключа не стёрло остальные.
 *
 * @param getSettings — чтение текущих настроек адаптера
 * @param patch — изменённые поля
 * @returns настройки для записи
 */
const mergeSettings = async (
  getSettings: HostSettings['getSettings'],
  patch: Partial<Settings>
): Promise<Settings> => {
  const current = await getSettings();

  return { ...current, ...patch };
};

/**
 * Настройки в хранилище менеджера userscript-ов: скрипты страницы до них не доберутся.
 *
 * Хранилище менеджера пусто (ключа нет или под ним null: настроек в null нет, и перенос не
 * должен из-за него молча пропасть), а в `storage` лежат настройки, сохранённые без
 * менеджера, — на первом чтении они переносятся в менеджер, а ключ из `storage` удаляется.
 * Битый JSON в `storage` удаляется без переноса. Запись идёт только в менеджер — объектом,
 * сериализует его сам менеджер.
 *
 * @param gmStore — хранилище менеджера
 * @param storage — `localStorage` страницы: источник переноса
 * @returns хранилище настроек для `Host`
 */
export const gmSettings = (gmStore: GmStore, storage: SettingsStorage): HostSettings => {
  const readStored = (): Partial<Settings> => {
    const stored: unknown = gmStore.getValue(SETTINGS_KEY);

    if (stored !== undefined && stored !== null) return pickSettings(stored);

    const raw = storage.getItem(SETTINGS_KEY);

    if (raw === null) return {};

    const legacy = parseStored(raw);

    if (legacy) {
      gmStore.setValue(SETTINGS_KEY, legacy);
    }

    storage.removeItem(SETTINGS_KEY);

    return legacy || {};
  };

  const getSettings = async (): Promise<Settings> => {
    return { ...DEFAULT_SETTINGS, ...readStored() };
  };

  return {
    getSettings,
    async setSettings(patch) {
      gmStore.setValue(SETTINGS_KEY, await mergeSettings(getSettings, patch));
    },
  };
};

/**
 * Настройки в `localStorage` страницы — для запуска без менеджера, когда другого хранилища
 * нет. Битый JSON даёт настройки по умолчанию.
 *
 * @param storage — `localStorage` страницы
 * @returns хранилище настроек для `Host`
 */
export const localStorageSettings = (storage: SettingsStorage): HostSettings => {
  const getSettings = async (): Promise<Settings> => {
    const stored = parseStored(storage.getItem(SETTINGS_KEY) || '{}');

    return { ...DEFAULT_SETTINGS, ...stored };
  };

  return {
    getSettings,
    async setSettings(patch) {
      storage.setItem(
        SETTINGS_KEY,
        JSON.stringify(await mergeSettings(getSettings, patch))
      );
    },
  };
};
