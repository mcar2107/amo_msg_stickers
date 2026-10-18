import type { PreviewTarget } from '@ui/Preview';
import type { PressPreviewMethods } from '@ui/usePressPreview';

/**
 * Параметры хука предпросмотра ячейки.
 */
export type UseCellPreviewOptions = {
  /**
   * Что показывает предпросмотр этой ячейки.
   */
  target: PreviewTarget;

  /**
   * Ячейка занята отправкой: удержание на ней не открывает и не переключает предпросмотр.
   */
  isBusy: boolean;
};

/**
 * Предпросмотр ячейки: методы удержания и закреплённое открытие из меню.
 */
export type CellPreview = PressPreviewMethods & {
  /**
   * Открывает закреплённый предпросмотр этой ячейки — пунктом «Предпросмотр» меню.
   *
   * @param source — кнопка ячейки, на которую вернётся фокус
   */
  openPinned: (source: HTMLElement) => void;
};
