import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

import type { PreviewState } from '@ui/Preview';
import { playPreviewClose, playPreviewOpen } from '@ui/Preview/previewMotion';

import type {
  PreviewFlightRefs,
  UsePreviewFlightOptions,
} from './usePreviewFlight.types';

/**
 * Вылет картинки из ячейки, возврат в неё и фокус закреплённого предпросмотра: всё, что слой
 * делает с узлами после коммита. Слой отдаёт узлам `ref`-ы из результата.
 *
 * Состояние читают эффекты вылета и ухода; эффекты идут в порядке объявления, поэтому к их
 * запуску ref состояния уже свежий. Сами они зависят только от `isShown` и `isLeaving`, а не
 * от состояния: смена ячейки при удержании не должна запускать полёт заново.
 *
 * @param options — состояние предпросмотра и колбэк конца ухода
 * @returns `ref`-ы узлов, которые анимирует хук
 */
export const usePreviewFlight = (options: UsePreviewFlightOptions): PreviewFlightRefs => {
  const { preview, onLeaveEnd } = options;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<PreviewState | null>(null);
  const isPinned = preview?.mode === 'pinned';
  const isLeaving = preview?.isLeaving || false;
  const isShown = preview !== null && !isLeaving;

  useLayoutEffect(() => {
    latestRef.current = preview;
  }, [preview]);

  /**
   * Вылет запускается на открытие предпросмотра, а не на смену ячейки при удержании: слой
   * остаётся смонтированным между ячейками, и `isShown` меняется только при появлении, в том
   * числе при повторном открытии посреди ухода (очистка уже отменила его). Узлы уже в
   * документе — это эффект после коммита.
   */
  useLayoutEffect(() => {
    const source = latestRef.current?.source;
    const flight = flightRef.current;

    if (!isShown || !source || !flight) return;

    playPreviewOpen({ source, flight, emoji: emojiRef.current });
  }, [isShown]);

  /**
   * Уход: картинка возвращается в ячейку, по концу анимаций слой снимается. Без летящего узла
   * анимировать нечего — слой снимается сразу, иначе уходящее состояние осталось бы навсегда.
   * Повторное открытие меняет `isLeaving` и отменяет уход очисткой; запоздалый `onLeaveEnd`
   * старого состояния провайдер игнорирует.
   */
  useLayoutEffect(() => {
    const leaving = latestRef.current;
    const flight = flightRef.current;

    if (!isLeaving || !leaving) return;

    if (!flight) {
      onLeaveEnd(leaving);

      return;
    }

    const leave = playPreviewClose({
      source: leaving.source,
      flight,
      emoji: emojiRef.current,
    });

    const finish = async () => {
      await leave.finished;
      onLeaveEnd(leaving);
    };

    void finish();

    return () => {
      leave.cancel();
    };
  }, [isLeaving, onLeaveEnd]);

  /**
   * Фокус ставится после монтирования: меню, из которого открыт предпросмотр, к этому
   * моменту уже вернуло фокус на источник. `isLeaving` в зависимостях: закреплённый
   * предпросмотр, открытый заново посреди ухода, не меняет `isPinned`, но слой уже тот же и
   * кнопка «Закрыть предпросмотр» на месте — без этого фокус на неё не встал бы, и Escape не
   * закрыл бы диалог.
   */
  useEffect(() => {
    if (isPinned && !isLeaving) closeButtonRef.current?.focus({ preventScroll: true });
  }, [isPinned, isLeaving]);

  return { flightRef, emojiRef, closeButtonRef };
};
