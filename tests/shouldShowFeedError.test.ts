import { describe, expect, it } from 'vitest';

import { shouldShowFeedError } from '../src/core/ui/Picker/useGifFeed/shouldShowFeedError';

describe('shouldShowFeedError', () => {
  it('пока открыт экран, ошибка ленты не перебивает его статус', () => {
    expect(
      shouldShowFeedError({ isLatest: true, startScreen: null, screen: 'settings' })
    ).toBe(false);
    expect(
      shouldShowFeedError({ isLatest: true, startScreen: 'add', screen: 'add' })
    ).toBe(false);
  });

  it('загрузка, начатая при открытом экране, молчит и после его закрытия', () => {
    expect(
      shouldShowFeedError({ isLatest: true, startScreen: 'settings', screen: null })
    ).toBe(false);
  });

  it('без экрана ошибка последнего запроса показывается', () => {
    expect(shouldShowFeedError({ isLatest: true, startScreen: null, screen: null })).toBe(
      true
    );
  });

  it('ошибка устаревшего запроса не показывается', () => {
    expect(
      shouldShowFeedError({ isLatest: false, startScreen: null, screen: null })
    ).toBe(false);
  });
});
