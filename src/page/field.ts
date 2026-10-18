import { isObject } from '@shared/guards';

/**
 * Поле чужого объекта без доверия к его форме: внутренности React и store amo — не API.
 *
 * @param value — объект или что угодно
 * @param name — имя поля
 * @returns значение поля; null — `value` не объект или поля нет
 */
export const fieldOf = (value: unknown, name: string): unknown => {
  return isObject(value) && name in value ? Reflect.get(value, name) : null;
};
