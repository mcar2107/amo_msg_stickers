import type { ComponentChildren } from 'preact';

import type { AddSegment } from '../../usePickerView/usePickerView.types';

export type SegmentFormProps = {
  /**
   * Сегмент, чью панель рисует форма.
   */
  segment: AddSegment;

  /**
   * Сегмент выбран: панель видна. Невыбранная остаётся смонтированной и скрыта `hidden`.
   */
  isActive: boolean;

  /**
   * Колбэк на отправку формы — кнопкой футера или Enter-ом из поля.
   */
  onSubmit: () => void;

  /**
   * Поля сегмента.
   */
  children: ComponentChildren;
};
