import type { Settings } from '../../../../host.types';

import type { CheckPlan } from './settingsDraft.types';

/**
 * Поля настроек, которые правит форма: обход идёт по ним, а не по ключам правок, — правка
 * не может завести поле, которого у настроек нет.
 */
const SETTINGS_KEYS: readonly (keyof Settings)[] = [
  'giphyKey',
  'klipyKey',
  'telegramToken',
];

/**
 * Что записать из правок формы. Значения сохраняются без пробелов по краям, а пустое — это
 * отсутствие ключа и пишется как есть. Поле, равное сохранённому, не пишется: повторный уход
 * из поля без правки ничего не записывает.
 *
 * @param saved — сохранённые настройки вместе с ещё идущими записями
 * @param edits — правки формы, как введены
 * @returns изменённые поля; `null` — писать нечего
 */
export const pendingWrite = (
  saved: Settings,
  edits: Partial<Settings>
): Partial<Settings> | null => {
  const patch = SETTINGS_KEYS.reduce<Partial<Settings>>((acc, key) => {
    const { [key]: edit } = edits;

    if (edit === undefined) return acc;

    const value = edit.trim();

    if (value !== saved[key]) acc[key] = value;

    return acc;
  }, {});

  return Object.keys(patch).length > 0 ? patch : null;
};

/**
 * Снимает записанные поля: поле, которое успело измениться после начала записи, остаётся.
 *
 * @param values — поля, ждущие записи
 * @param written — поля законченной записи
 * @returns поля, которые всё ещё ждут записи
 */
export const dropWritten = (
  values: Partial<Settings>,
  written: Partial<Settings>
): Partial<Settings> => {
  return SETTINGS_KEYS.reduce<Partial<Settings>>((acc, key) => {
    const { [key]: value } = values;

    if (value !== undefined && value !== written[key]) acc[key] = value;

    return acc;
  }, {});
};

/**
 * Какие поля проверить при фиксации значения. Проверяются только поля, правленные на этом
 * экране, — их прежнее значение лежит в `checked` с первой правки, — и только когда значение
 * непустое и отличается от последнего проверенного: проверка ключа тратит лимит запросов
 * источника, а пустое значение — отсутствие ключа, и проверять в нём нечего.
 *
 * @param values — текущие значения полей
 * @param checked — последние проверенные значения правленых полей
 * @returns поля к проверке и проверенные значения после фиксации
 */
export const checkPlan = (values: Settings, checked: Partial<Settings>): CheckPlan => {
  return SETTINGS_KEYS.reduce<CheckPlan>(
    (acc, key) => {
      const { [key]: last } = checked;

      if (last === undefined) return acc;

      const value = values[key].trim();

      acc.checked[key] = value;

      if (value && value !== last) acc.keys.push(key);

      return acc;
    },
    { keys: [], checked: {} }
  );
};
