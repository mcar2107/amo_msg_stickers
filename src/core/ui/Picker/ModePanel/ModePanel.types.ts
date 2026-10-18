import type { ComponentChildren } from 'preact';

import type { PickerMode } from '@core/pickerMode.types';

export type ModePanelProps = {
  /**
   * Режим, содержимое которого лежит в панели.
   */
  mode: PickerMode;

  /**
   * Видна ли панель: выбран её режим.
   */
  isActive: boolean;

  /**
   * Закрыта ли панель экраном: она остаётся в раскладке, но недоступна фокусу, клику и
   * скринридеру.
   */
  isInert: boolean;

  /**
   * Содержимое режима.
   */
  children: ComponentChildren;
};
