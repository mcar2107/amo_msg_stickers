import { useEffect, useMemo, useRef } from 'preact/hooks';

import { createPressGesture, shouldSwapPreview } from '@ui/pressGesture';

import type {
  PressPreviewMethods,
  UsePressPreviewOptions,
} from './usePressPreview.types';

/**
 * Удержание основной кнопки на ячейке: по `HOLD_DELAY_MS` зовёт `onHold`. Отпускание после
 * удержания и закрытие предпросмотра здесь не обрабатываются — их держит провайдер
 * предпросмотра на `window`, поэтому ячейка не помнит, что её держали.
 *
 * Вход указателя на другую ячейку при зажатой основной кнопке (`onSwap`) переключает уже
 * открытый предпросмотр без новой задержки: провайдер сам решает, открыт ли он удержанием.
 *
 * Актуальные `onHold`, `onSwap` и `isDisabled` читаются из ref, так что жест не пересоздаётся
 * при перерисовке ячейки и не теряет отсчёт. `onHold` читается в момент срабатывания таймера,
 * `onSwap` — в момент входа указателя, а `isDisabled` — в момент нажатия и входа указателя:
 * занятая отправкой ячейка не начинает удержание и не принимает смену, а уже идущий отсчёт
 * доходит до конца. Таймер снимается при размонтировании.
 *
 * @param options — колбэки удержания и смены, признак занятой ячейки
 * @returns методы, которые ячейка зовёт из обработчиков pointer-событий своей кнопки
 */
export const usePressPreview = (options: UsePressPreviewOptions): PressPreviewMethods => {
  const latestRef = useRef(options);
  const sourceRef = useRef<HTMLElement | null>(null);

  latestRef.current = options;

  const gesture = useMemo(() => {
    return createPressGesture({
      onHold: () => {
        const source = sourceRef.current;

        if (source) {
          latestRef.current.onHold(source);
        }
      },
    });
  }, []);

  useEffect(() => {
    return () => {
      gesture.dispose();
    };
  }, [gesture]);

  const start: PressPreviewMethods['start'] = (press, source) => {
    if (latestRef.current.isDisabled) return;

    sourceRef.current = source;
    gesture.start(press);
  };

  const enter: PressPreviewMethods['enter'] = (entry, source) => {
    const { pointerType, buttons } = entry;

    if (latestRef.current.isDisabled || !shouldSwapPreview(pointerType, buttons)) return;

    latestRef.current.onSwap(source);
  };

  const move: PressPreviewMethods['move'] = (x, y) => {
    gesture.move(x, y);
  };

  const cancel = () => {
    gesture.cancel();
  };

  return { start, enter, move, cancel };
};
