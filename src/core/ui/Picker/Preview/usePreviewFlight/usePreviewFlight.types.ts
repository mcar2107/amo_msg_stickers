import type { RefObject } from 'preact';

import type { PreviewState } from '@ui/Preview';

/**
 * Параметры хука полёта и фокуса предпросмотра.
 */
export type UsePreviewFlightOptions = {
  /**
   * Состояние предпросмотра; `null` — закрыт и слой пуст.
   */
  preview: PreviewState | null;

  /**
   * Уход доигран: хук зовёт с тем состоянием, которое уводил.
   */
  onLeaveEnd: (leaving: PreviewState) => void;
};

/**
 * Узлы, которые слой отдаёт хуку: тот анимирует их и ставит фокус.
 */
export type PreviewFlightRefs = {
  /**
   * Квадрат картинки: летит из ячейки и обратно.
   */
  flightRef: RefObject<HTMLDivElement>;

  /**
   * Эмодзи над картинкой.
   */
  emojiRef: RefObject<HTMLDivElement>;

  /**
   * Кнопка «Закрыть предпросмотр» закреплённого предпросмотра: на неё встаёт фокус.
   */
  closeButtonRef: RefObject<HTMLButtonElement>;
};
