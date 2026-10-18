import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scheduleTimeout } from '@core/hoverPopup';
import { createScrollLock } from '@ui/StickersMode/scrollLock';

const QUIET_MS = 150;

/**
 * Удержание на фейковых таймерах со шпионом `onChange`.
 *
 * @returns удержание и шпион колбэка
 */
const setup = () => {
  const onChange = vi.fn();
  const lock = createScrollLock({
    quietMs: QUIET_MS,
    schedule: scheduleTimeout,
    onChange,
  });

  return { lock, onChange };
};

describe('createScrollLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('без lock удержания нет', () => {
    const { lock } = setup();

    expect(lock.current()).toBeNull();
  });

  it('lock ставит раздел и зовёт onChange', () => {
    const { lock, onChange } = setup();

    lock.lock('tg:cats');

    expect(lock.current()).toBe('tg:cats');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('tg:cats');
  });

  it('удержание держится, пока события прокрутки идут чаще тишины', () => {
    const { lock, onChange } = setup();

    lock.lock('tg:cats');

    for (let step = 0; step < 10; step += 1) {
      vi.advanceTimersByTime(140);
      lock.scroll();
    }

    expect(lock.current()).toBe('tg:cats');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('снимается через 150 мс тишины после последнего события прокрутки', () => {
    const { lock, onChange } = setup();

    lock.lock('tg:cats');
    vi.advanceTimersByTime(100);
    lock.scroll();
    vi.advanceTimersByTime(149);

    expect(lock.current()).toBe('tg:cats');

    vi.advanceTimersByTime(1);

    expect(lock.current()).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('снимается тишиной и без единого события прокрутки', () => {
    const { lock } = setup();

    lock.lock('tg:cats');
    vi.advanceTimersByTime(150);

    expect(lock.current()).toBeNull();
  });

  it('interrupt снимает удержание сразу, и таймер тишины его не трогает', () => {
    const { lock, onChange } = setup();

    lock.lock('tg:cats');
    lock.interrupt();

    expect(lock.current()).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(null);

    vi.advanceTimersByTime(1000);

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('повторный lock заменяет раздел и перезапускает тишину', () => {
    const { lock, onChange } = setup();

    lock.lock('tg:cats');
    vi.advanceTimersByTime(100);
    lock.lock('custom');

    expect(lock.current()).toBe('custom');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('custom');

    vi.advanceTimersByTime(149);

    expect(lock.current()).toBe('custom');

    vi.advanceTimersByTime(1);

    expect(lock.current()).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('lock того же раздела перезапускает тишину без onChange', () => {
    const { lock, onChange } = setup();

    lock.lock('tg:cats');
    vi.advanceTimersByTime(100);
    lock.lock('tg:cats');
    vi.advanceTimersByTime(100);

    expect(lock.current()).toBe('tg:cats');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('scroll и interrupt без lock не зовут onChange', () => {
    const { lock, onChange } = setup();

    lock.scroll();
    lock.interrupt();
    vi.advanceTimersByTime(1000);

    expect(lock.current()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('после dispose таймер не срабатывает и onChange не зовётся', () => {
    const { lock, onChange } = setup();

    lock.lock('tg:cats');
    lock.dispose();
    vi.advanceTimersByTime(1000);
    lock.lock('custom');
    lock.scroll();
    lock.interrupt();
    vi.advanceTimersByTime(1000);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
