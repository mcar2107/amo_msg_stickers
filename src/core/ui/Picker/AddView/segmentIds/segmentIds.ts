import type { AddSegment } from '../../usePickerView/usePickerView.types';

/**
 * id вкладки сегмента — для `aria-labelledby` его панели.
 *
 * @param segment — сегмент экрана «Добавить стикеры»
 * @returns id, который не пересекается с id вкладок режимов и разделов
 */
export const segmentTabId = (segment: AddSegment): string => {
  return `picker-add-tab-${segment}`;
};

/**
 * id панели сегмента. Панель — форма сегмента, поэтому тот же id связывает с ней кнопку
 * футера атрибутом `form` и вкладку атрибутом `aria-controls`.
 *
 * @param segment — сегмент экрана «Добавить стикеры»
 * @returns id формы сегмента
 */
export const segmentFormId = (segment: AddSegment): string => {
  return `picker-add-form-${segment}`;
};
