import { isObject } from '@shared/guards';

import type { Settings } from './host.types';

export const DEFAULT_SETTINGS: Settings = {
  giphyKey: '',
  klipyKey: '',
  telegramToken: '',
};

/**
 * Ключи берутся из `DEFAULT_SETTINGS`, чтобы новое поле настроек не пришлось дописывать
 * сюда; `Object.keys` типизирован как `string[]`, а объект — ровно `Settings`, поэтому каст.
 */
const SETTINGS_FIELDS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

/**
 * Поля настроек из сохранённого значения: известные ключи со строковыми значениями,
 * остальное отбрасывается — ядру уходят только строки, какой бы ни была запись и в каком бы
 * окружении она ни лежала.
 *
 * @param value — значение из хранилища
 * @returns сохранённые поля; не объект — пусто
 */
export const pickSettings = (value: unknown): Partial<Settings> => {
  if (!isObject(value)) return {};

  return SETTINGS_FIELDS.reduce<Partial<Settings>>((acc, field) => {
    const fieldValue: unknown = Reflect.get(value, field);

    if (typeof fieldValue === 'string') {
      acc[field] = fieldValue;
    }

    return acc;
  }, {});
};
