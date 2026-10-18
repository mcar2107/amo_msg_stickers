import type { GifFeed } from '@core/sources';

export type FeedChipsProps = {
  /**
   * Источники, для которых сохранены ключи, в порядке переключателя.
   */
  feeds: GifFeed[];

  /**
   * Выбранный источник.
   */
  feed: GifFeed;

  /**
   * Колбэк на выбор источника.
   */
  onSelect: (feed: GifFeed) => void;
};
