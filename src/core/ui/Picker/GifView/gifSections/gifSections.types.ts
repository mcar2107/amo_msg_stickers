import type { FavoriteRec, RemoteGif } from '@core/db.types';
import type { FeedLoading } from '@ui/useGifFeed';

export type GifSectionsInput = {
  /**
   * Записи избранного от новых к старым; записи стикеров пропускаются.
   */
  favorites: FavoriteRec[];

  /**
   * Недавно отправленные GIF, свежие первыми, в том числе избранные.
   */
  recent: RemoteGif[];

  /**
   * Загруженная выдача источника: тренды или результаты поиска.
   */
  gifs: RemoteGif[];

  /**
   * Запрос, по которому загружена выдача; пустая строка — тренды.
   */
  term: string;

  /**
   * Есть ли источник: без ключей выдачи нет.
   */
  hasFeed: boolean;

  /**
   * Какая страница выдачи грузится; `null` — ничего не грузится.
   */
  loading: FeedLoading | null;
};

export type FavoriteGifs = {
  /**
   * Избранные GIF от новых к старым.
   */
  gifs: RemoteGif[];

  /**
   * Ключи записей избранных GIF: по ним недавние пропускают то, что уже стоит в избранном.
   */
  keys: Set<string>;
};
