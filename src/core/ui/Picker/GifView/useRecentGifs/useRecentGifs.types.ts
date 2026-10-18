import type { RemoteGif } from '@core/db.types';

export type RecentGifs = {
  /**
   * Недавние GIF, свежие первыми.
   */
  recent: RemoteGif[];

  /**
   * Убирает GIF из недавних. Промис не отклоняется: ошибка уходит в статус.
   */
  remove: (gif: RemoteGif) => Promise<void>;

  /**
   * Очищает недавние GIF, недавние стикеры не трогает. Промис не отклоняется: ошибка уходит в
   * статус.
   */
  clear: () => Promise<void>;
};
