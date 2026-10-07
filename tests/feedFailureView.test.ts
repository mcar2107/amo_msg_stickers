import { describe, expect, it } from 'vitest';

import { feedFailureView } from '../src/core/ui/Picker/useGifFeed/feedFailureView';

describe('feedFailureView', () => {
  it('ошибку, которую не показал статус, лента объявляет', () => {
    expect(
      feedFailureView({
        failure: { message: 'HTTP 401', isInStatus: false },
        gifCount: 0,
        isLoading: false,
      })
    ).toEqual({ message: 'HTTP 401', shouldAnnounce: true });
  });

  it('ошибку, которую показал статус, лента показывает без объявления', () => {
    expect(
      feedFailureView({
        failure: { message: 'HTTP 401', isInStatus: true },
        gifCount: 0,
        isLoading: false,
      })
    ).toEqual({ message: 'HTTP 401', shouldAnnounce: false });
  });

  it('лента с выдачей и идущая загрузка ошибку не показывают', () => {
    const failure = { message: 'HTTP 500', isInStatus: false };

    expect(feedFailureView({ failure, gifCount: 12, isLoading: false })).toBeNull();
    expect(feedFailureView({ failure, gifCount: 0, isLoading: true })).toBeNull();
  });

  it('без ошибки показывать нечего', () => {
    expect(feedFailureView({ failure: null, gifCount: 0, isLoading: false })).toBeNull();
  });
});
