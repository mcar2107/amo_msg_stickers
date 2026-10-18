import type { Pack } from '@core/db.types';
import { packTitle } from '@core/packTitle';

import { clampGraphemes } from './limits';

/**
 * Расширение файла выгрузки: файл не спутать с обычным архивом, а диалог выбора фильтрует свои файлы.
 */
export const FILE_EXTENSION = '.amostickers';

/**
 * Запасное имя: название пака пустое после очистки или занято системой.
 */
const FALLBACK_NAME = 'amo-stickers';

/**
 * Длина имени без расширения, графем: с расширением и суффиксом браузера «(1)» имя остаётся в пределе файловых
 * систем.
 */
const MAX_NAME_GRAPHEMES = 100;

/**
 * Управляющие символы и символы направления текста — те же классы, что вычищает метка имени отправляемого файла, но
 * без точки: в названии пака она допустима. Символ направления развернул бы показ имени и спрятал настоящее
 * расширение.
 */
const NAME_JUNK = /[\p{Cc}\p{Bidi_Control}]/gu;

/**
 * Разделители путей и символы, которые не пропускает Windows.
 */
const NAME_FORBIDDEN = /[\\/:*?"<>|]/g;

/**
 * Точки и пробелы в начале: имя с точки в macOS и Linux — скрытый файл, и выгрузка пропала бы из вида.
 */
const NAME_LEADING = /^[. ]+/;

/**
 * Точки и пробелы в конце: Windows их снимает сам, и имя разошлось бы с показанным.
 */
const NAME_TRAILING = /[. ]+$/;

/**
 * Имена устройств Windows без учёта регистра — и с любым расширением: `NUL.txt` занят так же, как `NUL`.
 */
const RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

/**
 * @param raw — название пака
 * @returns имя без расширения, безопасное для файловых систем
 */
const safeName = (raw: string) => {
  /**
   * Начало снимается до урезания, чтобы точки в начале не съели предел длины.
   */
  const replaced = raw
    .replaceAll(NAME_JUNK, '')
    .replaceAll(NAME_FORBIDDEN, '_')
    .replace(NAME_LEADING, '');
  const name = clampGraphemes(replaced, MAX_NAME_GRAPHEMES).replace(NAME_TRAILING, '');

  return !name || RESERVED_NAME.test(name) ? FALLBACK_NAME : name;
};

/**
 * Имя файла выгрузки пака — по его названию в интерфейсе: «Мои стикеры» — на языке интерфейса.
 *
 * @param pack — id и название из записи пака
 * @returns имя файла с расширением `.amostickers`
 */
export const packFileName = (pack: Pick<Pack, 'id' | 'title'>) => {
  return `${safeName(packTitle(pack))}${FILE_EXTENSION}`;
};

/**
 * @param value — число дня или месяца
 * @returns число двумя цифрами
 */
const twoDigits = (value: number) => {
  return String(value).padStart(2, '0');
};

/**
 * Имя файла выгрузки библиотеки — по местной дате: так её видит пользователь.
 *
 * @param date — момент выгрузки
 * @returns `amo-stickers-<ГГГГ-ММ-ДД>.amostickers`
 */
export const libraryFileName = (date: Date) => {
  const day = `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;

  return `${FALLBACK_NAME}-${day}${FILE_EXTENSION}`;
};
