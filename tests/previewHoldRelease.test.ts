import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { watchHoldRelease } from '@ui/Preview/holdRelease';

import { CountingEventTarget } from './helpers';

const dispatchClick = (target: EventTarget) => {
  const event = new Event('click', { cancelable: true });

  target.dispatchEvent(event);

  return event;
};

describe('watchHoldRelease', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pointerup зовёт onRelease один раз и снимает слушатели отпускания', () => {
    const target = new CountingEventTarget();
    const onRelease = vi.fn();

    watchHoldRelease(target, onRelease);
    expect(target.listenerCount('pointerup')).toBe(1);
    expect(target.listenerCount('pointercancel')).toBe(1);

    target.dispatchEvent(new Event('pointerup'));
    target.dispatchEvent(new Event('pointerup'));

    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(target.listenerCount('pointerup')).toBe(0);
    expect(target.listenerCount('pointercancel')).toBe(0);
  });

  it('pointercancel тоже завершает удержание', () => {
    const target = new CountingEventTarget();
    const onRelease = vi.fn();

    watchHoldRelease(target, onRelease);
    target.dispatchEvent(new Event('pointercancel'));

    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('гасит ровно один click после отпускания', () => {
    const target = new CountingEventTarget();
    const reached = vi.fn();

    watchHoldRelease(target, () => {});
    target.dispatchEvent(new Event('pointerup'));

    /**
     * Слушатель регистрируется после гашения: `EventTarget` в Node зовёт слушатели цели в
     * порядке регистрации, а на `window` страницы перехват идёт раньше любого слушателя ниже.
     */
    target.addEventListener('click', reached);

    const first = dispatchClick(target);

    expect(first.defaultPrevented).toBe(true);
    expect(reached).toHaveBeenCalledTimes(0);

    const second = dispatchClick(target);

    expect(second.defaultPrevented).toBe(false);
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it('без click слушатель гашения снимается по setTimeout(0)', () => {
    const target = new CountingEventTarget();

    watchHoldRelease(target, () => {});
    target.dispatchEvent(new Event('pointerup'));
    expect(target.listenerCount('click')).toBe(1);

    vi.advanceTimersByTime(0);
    expect(target.listenerCount('click')).toBe(0);

    const late = dispatchClick(target);

    expect(late.defaultPrevented).toBe(false);
  });

  it('после погашенного click слушатель снят сразу', () => {
    const target = new CountingEventTarget();

    watchHoldRelease(target, () => {});
    target.dispatchEvent(new Event('pointerup'));
    dispatchClick(target);

    expect(target.listenerCount('click')).toBe(0);
  });

  it('снятие до отпускания убирает слушатели, onRelease не зовётся и click не гасится', () => {
    const target = new CountingEventTarget();
    const onRelease = vi.fn();
    const stop = watchHoldRelease(target, onRelease);

    stop();
    target.dispatchEvent(new Event('pointerup'));

    expect(onRelease).not.toHaveBeenCalled();
    expect(target.listenerCount('pointerup')).toBe(0);
    expect(target.listenerCount('pointercancel')).toBe(0);
    expect(dispatchClick(target).defaultPrevented).toBe(false);
  });

  it('отменяет selectstart, пока кнопка зажата, и перестаёт после отпускания', () => {
    const target = new CountingEventTarget();

    watchHoldRelease(target, () => {});

    const during = new Event('selectstart', { cancelable: true });

    target.dispatchEvent(during);
    expect(during.defaultPrevented).toBe(true);

    target.dispatchEvent(new Event('pointerup'));

    const after = new Event('selectstart', { cancelable: true });

    target.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
    expect(target.listenerCount('selectstart')).toBe(0);
  });
});
