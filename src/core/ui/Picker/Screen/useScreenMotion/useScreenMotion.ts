import { useLayoutEffect, useRef } from 'preact/hooks';

import { isMotionReduced } from '../../scrollMotion/scrollMotion';
import { usePickerView } from '../../usePickerView/usePickerView';

import { playScreenLeave } from './playScreenLeave/playScreenLeave';
import { SCREEN_ENTER_MS } from './screenTiming';
import type { ScreenMotion } from './useScreenMotion.types';

/**
 * Появление экрана: из прозрачности со сдвигом вправо на `translate-x-2` (0,5rem). Уход — та же
 * анимация в обратную сторону.
 */
const SCREEN_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: 'translateX(0.5rem)' },
  { opacity: 1, transform: 'none' },
];

/**
 * Кривая — токен перехода по умолчанию из `tailwind.config.ts`.
 */
const SCREEN_EASING = 'ease-in-out';

/**
 * Появление и уход экрана — анимации скрипта (`element.animate()`), а не CSS-переход из
 * `@starting-style`: закрытая панель скрыта `display: none`, и при повторном открытии попапа
 * переход из `@starting-style` проиграл бы появление смонтированного экрана заново. Анимация
 * скрипта проигрывается один раз — при монтировании экрана, то есть при переходе на него внутри
 * открытого попапа. При уменьшении движения экран появляется сразу.
 *
 * Уход закрывает экран по своему концу (`playScreenLeave`); повторный уход во время ухода ничего
 * не делает. Экран, снятый во время ухода другим путём (кнопка футера, смена экрана), уже закрыт
 * или заменён, и конец его анимации экран не закрывает.
 *
 * @returns ref корня экрана и уход
 */
export const useScreenMotion = (): ScreenMotion => {
  const { closeScreen } = usePickerView();
  const screenRef = useRef<HTMLElement>(null);
  const motionRef = useRef<Animation | null>(null);
  const isLeavingRef = useRef(false);
  const isMountedRef = useRef(true);

  useLayoutEffect(() => {
    const element = screenRef.current;

    isMountedRef.current = true;

    /**
     * `fill: 'backwards'` держит начало анимации до её старта и после ухода — проигранной назад
     * до начала: экран не мелькает видимым между концом ухода и размонтированием. После
     * появления анимация на экране не держится.
     */
    if (element) {
      motionRef.current = element.animate(SCREEN_KEYFRAMES, {
        duration: isMotionReduced() ? 0 : SCREEN_ENTER_MS,
        easing: SCREEN_EASING,
        fill: 'backwards',
      });
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const leave = () => {
    if (isLeavingRef.current) return;

    isLeavingRef.current = true;

    void playScreenLeave({
      motion: motionRef.current,
      isReduced: isMotionReduced(),
      isMounted: () => {
        return isMountedRef.current;
      },
      onClose: closeScreen,
    });
  };

  return { screenRef, leave };
};
