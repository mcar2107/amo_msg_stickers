import {
  SCREEN_ENTER_MS,
  SCREEN_LEAVE_MS,
} from '@ui/Screen/useScreenMotion/screenTiming';

import type { PlayScreenLeaveOptions } from './playScreenLeave.types';

/**
 * Уход экрана — появление в обратную сторону с того места, где оно сейчас, за `SCREEN_LEAVE_MS`
 * от полностью показанного экрана; экран закрывается по концу анимации. Без анимации или при
 * уменьшении движения экран закрывается сразу.
 *
 * `display: none` закрытой панели анимацию не отменяет: уход, начатый перед закрытием попапа,
 * доигрывается, и экран закрывается по его концу. Отмена анимации тоже закрывает экран — это
 * защита, а не рабочий путь.
 *
 * @param options — анимация появления, уменьшение движения, признак монтирования и закрытие
 */
export const playScreenLeave = async (options: PlayScreenLeaveOptions): Promise<void> => {
  const { motion, isReduced, isMounted, onClose } = options;

  if (!motion || isReduced) {
    onClose();

    return;
  }

  /**
   * Скорость ставится до `reverse()`: он обращает её знак и играет с текущего места, поэтому
   * уход с середины появления короче и `SCREEN_LEAVE_MS`.
   */
  motion.playbackRate = SCREEN_ENTER_MS / SCREEN_LEAVE_MS;
  motion.reverse();

  try {
    await motion.finished;
  } catch {
    /**
     * Отменённая анимация — тоже конец ухода: экран закрывается.
     */
  }

  if (isMounted()) onClose();
};
