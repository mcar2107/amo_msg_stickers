import type { AddSegment } from '@ui/usePickerView';

export type ImportFooterProps = {
  /**
   * Сегмент, чью форму отправляет «Импорт».
   */
  segment: Exclude<AddSegment, 'custom'>;

  /**
   * Идёт импорт: на месте «Импорт» стоит «Отменить».
   */
  isImporting: boolean;

  /**
   * «Импорт» недоступен: импортировать нечего или идёт другой импорт. Недоступная кнопка не
   * даёт и отправить форму Enter-ом.
   */
  isDisabled: boolean;

  /**
   * «Отменить» недоступна: импорт дошёл до этапа, который не прерывается.
   */
  isCancelDisabled: boolean;

  /**
   * Колбэк на отмену идущего импорта.
   */
  onCancel: () => void;
};
