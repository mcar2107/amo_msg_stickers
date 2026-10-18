import { describe, expect, it, vi } from 'vitest';

import type { ScreenLeaveMotion } from '@ui/Screen/useScreenMotion/playScreenLeave';
import { playScreenLeave } from '@ui/Screen/useScreenMotion/playScreenLeave';
import {
  SCREEN_ENTER_MS,
  SCREEN_LEAVE_MS,
} from '@ui/Screen/useScreenMotion/screenTiming';

/**
 * Анимация появления, конец которой тест завершает сам; `reverse` запоминает скорость на
 * момент вызова.
 *
 * @returns анимация, шпион `reverse`, скорости при `reverse` и завершение анимации
 */
const fakeMotion = () => {
  let finish = () => {};

  let cancel: (reason: Error) => void = () => {};

  const finished = new Promise<void>((resolve, reject) => {
    finish = resolve;
    cancel = reject;
  });
  const ratesAtReverse: number[] = [];
  const motion: ScreenLeaveMotion = {
    playbackRate: 1,
    reverse: vi.fn(() => {
      ratesAtReverse.push(motion.playbackRate);
    }),
    finished,
  };

  return { motion, ratesAtReverse, finish, cancel };
};

/**
 * Даёт отработать микрозадачам после конца анимации.
 */
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

/**
 * Экран, который не снимают во время ухода.
 *
 * @returns всегда смонтирован
 */
const alwaysMounted = () => {
  return true;
};

describe('playScreenLeave', () => {
  it('без анимации закрывает экран сразу, синхронно', () => {
    const onClose = vi.fn();

    void playScreenLeave({
      motion: null,
      isReduced: false,
      isMounted: alwaysMounted,
      onClose,
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('при уменьшении движения закрывает экран сразу и анимацию не трогает', () => {
    const { motion } = fakeMotion();
    const onClose = vi.fn();

    void playScreenLeave({ motion, isReduced: true, isMounted: alwaysMounted, onClose });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(motion.reverse).not.toHaveBeenCalled();
  });

  it('ставит скорость ухода до reverse и закрывает экран по концу анимации', async () => {
    const { motion, ratesAtReverse, finish } = fakeMotion();
    const onClose = vi.fn();

    void playScreenLeave({ motion, isReduced: false, isMounted: alwaysMounted, onClose });

    expect(ratesAtReverse).toEqual([SCREEN_ENTER_MS / SCREEN_LEAVE_MS]);
    expect(ratesAtReverse[0]).toBe(2);

    await flush();

    expect(onClose).not.toHaveBeenCalled();

    finish();
    await flush();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('отменённая анимация тоже закрывает экран', async () => {
    const { motion, cancel } = fakeMotion();
    const onClose = vi.fn();

    void playScreenLeave({ motion, isReduced: false, isMounted: alwaysMounted, onClose });

    cancel(new Error('AbortError'));
    await flush();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('экран, снятый во время ухода, конец анимации не закрывает', async () => {
    const { motion, finish } = fakeMotion();
    const onClose = vi.fn();
    let isMounted = true;

    void playScreenLeave({
      motion,
      isReduced: false,
      isMounted: () => {
        return isMounted;
      },
      onClose,
    });

    isMounted = false;
    finish();
    await flush();

    expect(onClose).not.toHaveBeenCalled();
  });
});
