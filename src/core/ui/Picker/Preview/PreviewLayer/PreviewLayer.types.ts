import type { PreviewDirection } from '../previewDirection/previewDirection.types';
import type { PreviewState } from '../PreviewProvider.types';

export type PreviewLayerProps = {
  /**
   * Открытый предпросмотр; `null` — слой пуст.
   */
  preview: PreviewState | null;

  /**
   * Закрывает предпросмотр: Escape, клик и уход фокуса.
   */
  onClose: () => void;

  /**
   * Колбэк на стрелку в закреплённом предпросмотре: переключить на соседнюю ячейку ленты.
   */
  onStep: (direction: PreviewDirection) => void;

  /**
   * Уход доигран: слой зовёт с тем состоянием, которое уводил, и провайдер его снимает.
   */
  onLeaveEnd: (leaving: PreviewState) => void;
};
