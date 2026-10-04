import type { FunctionComponent as FC } from 'preact';

import type { GifFeed } from '../../../../sources/gifs.types';

import type { FeedAttributionProps } from './FeedAttribution.types';

/**
 * Подпись источника — условие использования API у обоих провайдеров.
 */
const FEED_ATTRIBUTION: Record<GifFeed, string> = {
  'giphy-gifs': 'Powered by GIPHY',
  'giphy-stickers': 'Powered by GIPHY',
  klipy: 'Powered by KLIPY',
};

/**
 * Полоса с подписью выбранного источника под лентой GIF. Стоит вне прокручиваемой ленты,
 * поэтому видна без прокрутки при любой длине выдачи.
 */
export const FeedAttribution: FC<FeedAttributionProps> = (props) => {
  const { feed } = props;

  return (
    <div className="shrink-0 px-2.5 py-1 text-right text-xxs text-cadetGray-30 dark:text-gray-70">
      {FEED_ATTRIBUTION[feed]}
    </div>
  );
};
