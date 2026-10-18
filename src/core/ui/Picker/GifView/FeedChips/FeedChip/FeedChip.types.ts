import type { GifFeed } from '@core/sources';

export type FeedChipProps = {
  /**
   * Источник, который выбирает чип.
   */
  feed: GifFeed;

  /**
   * Источник выбран: чип залит акцентным цветом.
   */
  isSelected: boolean;

  /**
   * Колбэк на выбор источника.
   */
  onSelect: (feed: GifFeed) => void;
};
