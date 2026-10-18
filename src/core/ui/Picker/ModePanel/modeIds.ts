import type { PickerMode } from '@core/pickerMode.types';

/**
 * id кнопки режима в нижнем переключателе — для `aria-labelledby` панели режима.
 *
 * @param mode — режим
 * @returns id, который не пересекается с id вкладок разделов
 */
export const modeTabId = (mode: PickerMode): string => {
  return `picker-mode-tab-${mode}`;
};

/**
 * id панели режима — для `aria-controls` его кнопки.
 *
 * @param mode — режим
 * @returns id панели режима
 */
export const modePanelId = (mode: PickerMode): string => {
  return `picker-mode-${mode}`;
};
