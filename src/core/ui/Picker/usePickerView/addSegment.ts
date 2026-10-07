import type { AddSegment } from './usePickerView.types';

/**
 * Сегмент экрана «Добавить стикеры», пока пользователь не выбрал другой: импорт пака —
 * основной способ пополнить библиотеку.
 */
export const DEFAULT_ADD_SEGMENT: AddSegment = 'telegram';

/**
 * Сегмент, на котором откроется экран «Добавить стикеры». Без запрошенного остаётся
 * последний выбранный: «+» возвращает туда, где пользователь был, а плитка «Создать стикер»
 * просит свой.
 *
 * @param current — сегмент, выбранный последним
 * @param requested — сегмент, который просит точка входа; `undefined` — без пожелания
 * @returns сегмент открываемого экрана
 */
export const resolveAddSegment = (
  current: AddSegment,
  requested: AddSegment | undefined
): AddSegment => {
  return requested || current;
};
