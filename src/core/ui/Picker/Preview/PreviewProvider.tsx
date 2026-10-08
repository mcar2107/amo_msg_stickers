import type { FunctionComponent as FC } from 'preact';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import { usePicker } from '../PickerProvider/usePicker';
import { usePickerView } from '../usePickerView/usePickerView';

import { watchHoldRelease } from './holdRelease/holdRelease';
import type { PreviewDirection } from './previewDirection/previewDirection.types';
import { PreviewContext } from './PreviewContext';
import type {
  PreviewContextValue,
  PreviewNavigator,
  PreviewProviderProps,
  PreviewState,
  PreviewTarget,
} from './PreviewProvider.types';

/**
 * Предпросмотр один на панель, а не на ячейку: ячейки лежат под виртуализацией и
 * размонтируются, оверлей и отпускание кнопки должны их пережить.
 *
 * Пока предпросмотр открыт, попап удерживается (причина `preview`): уход курсора за панель
 * посреди удержания не закрывает попап. Предпросмотр закрывается вместе с панелью, при
 * переключении режима и при открытии экрана — обычные клики под подложкой закрыты, но
 * переключение идёт и с клавиатуры.
 *
 * Пока кнопка зажата, курсор можно вести по другим ячейкам: `swapHold` подставляет ячейку
 * под курсором без новой задержки, слушатели отпускания при этом остаются теми же.
 *
 * Слушатели отпускания взводятся в `openHold` синхронно, а не эффектом после рендера:
 * `pointerup` в пределах кадра после срабатывания задержки в эффект бы не успел, и предпросмотр
 * остался бы открытым без кнопки.
 */
export const PreviewProvider: FC<PreviewProviderProps> = (props) => {
  const { phase, children } = props;
  const { setHold } = usePicker();
  const { mode, screen } = usePickerView();
  const [preview, setPreview] = useState<PreviewState | null>(null);
  /**
   * Текущее состояние для `step`: навигатор зовётся вне функции обновления. Синхронно после
   * рендера, а не эффектом после отрисовки: зажатая стрелка шлёт нажатия чаще кадров.
   */
  const previewRef = useRef(preview);

  useLayoutEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  /**
   * Уходящий предпросмотр считается закрытым: слой ещё на экране, но удержания попапа нет.
   */
  const isOpen = preview !== null && !preview.isLeaving;
  const isPanelClosed = phase === 'closed';

  const unwatchReleaseRef = useRef<(() => void) | null>(null);

  const unwatchRelease = useCallback(() => {
    unwatchReleaseRef.current?.();
    unwatchReleaseRef.current = null;
  }, []);

  /**
   * Закрытие — не обнуление, а уход: слой доигрывает обратную анимацию и по её концу зовёт
   * `finishLeave`. Закрытый предпросмотр остаётся `null`, уходящий — уходящим.
   */
  const close = useCallback(() => {
    unwatchRelease();
    setPreview((current) => {
      return current && !current.isLeaving ? { ...current, isLeaving: true } : current;
    });
  }, [unwatchRelease]);

  const finishLeave = useCallback((leaving: PreviewState) => {
    setPreview((current) => {
      return current === leaving ? null : current;
    });
  }, []);

  const openHold = useCallback(
    (target: PreviewTarget, source: HTMLElement) => {
      unwatchRelease();
      unwatchReleaseRef.current = watchHoldRelease(window, close);
      setPreview({
        target,
        mode: 'hold',
        source,
        isLeaving: false,
        navigate: null,
        stepCount: 0,
      });
    },
    [unwatchRelease, close]
  );

  const swapHold = useCallback((target: PreviewTarget, source: HTMLElement) => {
    setPreview((current) => {
      return current?.mode === 'hold' && !current.isLeaving
        ? { ...current, target, source }
        : current;
    });
  }, []);

  const openPinned = useCallback(
    (
      target: PreviewTarget,
      source: HTMLElement,
      navigate: PreviewNavigator | null = null
    ) => {
      unwatchRelease();
      setPreview({
        target,
        mode: 'pinned',
        source,
        isLeaving: false,
        navigate,
        stepCount: 0,
      });
    },
    [unwatchRelease]
  );

  /**
   * Навигатор зовётся вне функции обновления состояния: он прокручивает ленту, а функция
   * обновления должна быть чистой. Шаг применяется, только если предпросмотр за это время не
   * сменился — не закрыт и не открыт заново.
   */
  const step = useCallback((direction: PreviewDirection) => {
    const current = previewRef.current;

    if (!current || current.mode !== 'pinned' || current.isLeaving || !current.navigate)
      return;

    const next = current.navigate(current.source, direction);

    if (!next) return;

    const stepped: PreviewState = {
      ...current,
      ...next,
      stepCount: current.stepCount + 1,
    };

    /**
     * Следующее нажатие может прийти до рендера: оно шагает уже от новой ячейки.
     */
    previewRef.current = stepped;
    setPreview((latest) => {
      return latest === current ? stepped : latest;
    });
  }, []);

  useEffect(() => {
    setHold('preview', isOpen);
  }, [isOpen, setHold]);

  useEffect(() => {
    return () => {
      unwatchRelease();
      setHold('preview', false);
    };
  }, [setHold, unwatchRelease]);

  useEffect(() => {
    if (isPanelClosed) close();
  }, [isPanelClosed, close]);

  useEffect(() => {
    close();
  }, [mode, screen, close]);

  const value = useMemo<PreviewContextValue>(() => {
    return { preview, openHold, swapHold, openPinned, step, close, finishLeave };
  }, [preview, openHold, swapHold, openPinned, step, close, finishLeave]);

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
};
