import type { PickerMode } from '@core/pickerMode.types';

export type ModeTabProps = {
  /**
   * Режим, который открывает кнопка.
   */
  mode: PickerMode;

  /**
   * Подпись кнопки.
   */
  title: string;
};
