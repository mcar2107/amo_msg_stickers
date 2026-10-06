import type { AddSegment } from '../../usePickerView/usePickerView.types';

export type SegmentTabProps = {
  /**
   * Сегмент, который выбирает вкладка.
   */
  segment: AddSegment;

  /**
   * Подпись вкладки.
   */
  title: string;
};
