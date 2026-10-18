import { afterEach, describe, expect, it, vi } from 'vitest';

import { isMotionReduced, scrollMotion } from '@ui/scrollMotion';

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Подменяет `matchMedia`: запрос уменьшения движения совпадает, если `isReduced`.
 *
 * @param isReduced — включена ли в системе настройка уменьшения движения
 */
const stubMotion = (isReduced: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => {
    return { matches: isReduced && query === REDUCE_QUERY };
  });
};

describe('scrollMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reduce — прокрутка мгновенная', () => {
    stubMotion(true);

    expect(scrollMotion()).toBe('auto');
  });

  it('no-preference — прокрутка плавная', () => {
    stubMotion(false);

    expect(scrollMotion()).toBe('smooth');
  });

  it('без matchMedia — прокрутка плавная', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(scrollMotion()).toBe('smooth');
  });

  it('настройка читается на момент вызова', () => {
    stubMotion(false);

    expect(scrollMotion()).toBe('smooth');

    stubMotion(true);

    expect(scrollMotion()).toBe('auto');
  });
});

describe('isMotionReduced', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reduce — движение уменьшено', () => {
    stubMotion(true);

    expect(isMotionReduced()).toBe(true);
  });

  it('no-preference и без matchMedia — движение есть', () => {
    stubMotion(false);

    expect(isMotionReduced()).toBe(false);

    vi.stubGlobal('matchMedia', undefined);

    expect(isMotionReduced()).toBe(false);
  });
});
