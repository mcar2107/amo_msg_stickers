import { shouldShowFeedFailure } from './shouldShowFeedFailure';
import type { FeedFailure, FeedFailureViewOptions } from './useGifFeed.types';

/**
 * Ошибка на месте пустой выдачи и надо ли её объявить. Объявляется только ошибка, которую не
 * показала строка статуса: строка — live region, и ошибка, объявленная ею, прозвучала бы
 * второй раз из ленты.
 *
 * @param options — ошибка последней загрузки, число GIF в выдаче и идёт ли загрузка
 * @returns ошибка для показа или `null` — показывать нечего
 */
export const feedFailureView = (options: FeedFailureViewOptions): FeedFailure | null => {
  const { failure, gifCount, isLoading } = options;

  if (!failure) return null;
  const { message, isInStatus } = failure;

  if (!shouldShowFeedFailure({ failure: message, gifCount, isLoading })) return null;

  return { message, shouldAnnounce: !isInStatus };
};
