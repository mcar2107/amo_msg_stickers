import { useState } from 'preact/hooks';

import type { Settings } from '@core/host.types';
import type { GifFeed } from '@core/sources';
import { availableFeeds } from '@core/sources';

import type { FeedChoice } from './useFeedChoice.types';

/**
 * Выбор источника GIF среди тех, для которых есть ключ. Если ключ выбранного источника
 * убрали в настройках, лента переходит на первый доступный.
 *
 * @param settings — текущие настройки с ключами
 * @returns доступные источники, выбранный и выбор
 */
export const useFeedChoice = (settings: Settings): FeedChoice => {
  const [chosen, setChosen] = useState<GifFeed | null>(null);
  const feeds = availableFeeds(settings);
  const feed = chosen && feeds.includes(chosen) ? chosen : feeds[0] || null;

  return { feeds, feed, selectFeed: setChosen };
};
