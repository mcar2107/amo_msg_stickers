import { describe, expect, it } from 'vitest';

import { shouldShowFeedFailure } from '../src/core/ui/Picker/useGifFeed/shouldShowFeedFailure';

describe('shouldShowFeedFailure', () => {
  it('пустая лента после упавшей загрузки показывает ошибку на месте выдачи', () => {
    expect(
      shouldShowFeedFailure({ failure: 'HTTP 401', gifCount: 0, isLoading: false })
    ).toBe(true);
  });

  it('новая загрузка прячет ошибку: на месте выдачи заглушки', () => {
    expect(
      shouldShowFeedFailure({ failure: 'HTTP 401', gifCount: 0, isLoading: true })
    ).toBe(false);
  });

  it('лента с выдачей ошибку на месте выдачи не показывает', () => {
    expect(
      shouldShowFeedFailure({ failure: 'HTTP 500', gifCount: 12, isLoading: false })
    ).toBe(false);
  });

  it('без ошибки показывать нечего', () => {
    expect(shouldShowFeedFailure({ failure: null, gifCount: 0, isLoading: false })).toBe(
      false
    );
  });
});
