import type { AddSegment } from '@ui/usePickerView';

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
