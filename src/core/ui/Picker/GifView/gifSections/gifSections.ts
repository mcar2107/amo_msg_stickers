import { itemKey } from '@core/db';
import type { FavoriteRec, RecentRec, RemoteGif } from '@core/db.types';
import { t } from '@core/i18n';
import type { GifSection } from '@ui/MasonryGrid';
import { COLUMN_COUNT } from '@ui/MasonryGrid/tileBox';
import type { FeedLoading } from '@ui/useGifFeed';

import type { FavoriteGifs, GifSectionsInput } from './gifSections.types';

/**
 * id раздела недавних GIF. Он входит в id кнопки ячейки (`gifCellId`), и по нему же ячейку ищет
 * фокус после «Убрать из недавних» (`useGifRemovalFocus`).
 */
export const RECENT_GIF_SECTION_ID = 'recent';

/**
 * id раздела избранных GIF — в id кнопки ячейки и в выборе фокуса после правки избранного.
 */
export const FAVORITE_GIF_SECTION_ID = 'favorite';

/**
 * Заглушек на всю ленту при первой загрузке: пустая область до ответа источника читается
 * как «ничего нет», а восемь плиток закрывают видимую высоту ленты.
 */
const FIRST_PAGE_SKELETONS = 8;

/**
 * Заглушек в конец каждой колонки для загружающейся страницы. При подгрузке — по одной:
 * видно, что лента продолжается, а заглушки после всех элементов не сдвигают показанные GIF.
 *
 * @param loading — какая страница грузится
 * @returns заглушек на колонку
 */
const skeletonsPerColumn = (loading: FeedLoading | null): number => {
  switch (loading) {
    case 'first': {
      return Math.ceil(FIRST_PAGE_SKELETONS / COLUMN_COUNT);
    }

    case 'more': {
      return 1;
    }

    case null: {
      return 0;
    }

    default: {
      const unknownLoading: never = loading;

      throw new Error(`Unknown feed loading: ${String(unknownLoading)}`);
    }
  }
};

/**
 * GIF из записей избранного и их ключи.
 *
 * @param favorites — записи избранного от новых к старым
 * @returns GIF в порядке записей и ключи записей GIF
 */
const favoriteGifs = (favorites: FavoriteRec[]): FavoriteGifs => {
  return favorites.reduce<FavoriteGifs>(
    (acc, { key, item }) => {
      if (item.kind === 'remote') {
        acc.gifs.push(item.gif);
        acc.keys.add(key);
      }

      return acc;
    },
    { gifs: [], keys: new Set() }
  );
};

/**
 * Разделы ленты режима «GIF». Избранное и недавние стоят над трендами, но не над результатами
 * поиска: при непустом запросе пользователь ищет конкретное. Избранная GIF в недавних не
 * повторяется — она уже есть разделом выше. Без ключей выдачи нет, а избранное и недавние
 * остаются — их отправка источнику не нужна.
 *
 * Пока выдача грузится, в конце её раздела стоят заглушки.
 *
 * @param input — избранное, недавние, выдача, её запрос, загрузка и наличие источника
 * @returns разделы сверху вниз
 */
export const gifSections = (input: GifSectionsInput): GifSection[] => {
  const { favorites, recent, gifs, term, hasFeed, loading } = input;
  const sections: GifSection[] = [];

  if (!term) {
    const favorite = favoriteGifs(favorites);

    if (favorite.gifs.length)
      sections.push({
        id: FAVORITE_GIF_SECTION_ID,
        title: t('gifs.favorites'),
        items: favorite.gifs,
        skeletons: 0,
        kind: 'favorite',
      });

    const recentItems = recent.filter((gif) => {
      return !favorite.keys.has(itemKey({ kind: 'remote', gif }));
    });

    if (recentItems.length)
      sections.push({
        id: RECENT_GIF_SECTION_ID,
        title: t('gifs.recent'),
        items: recentItems,
        skeletons: 0,
        kind: 'recent',
      });
  }

  /**
   * Заголовок трендов нужен только под разделом выше — отделить одну выдачу от другой. Одна
   * выдача без них идёт без заголовка, как и результаты поиска.
   */
  if (hasFeed) {
    sections.push({
      id: 'feed',
      title: sections.length ? t('gifs.trends') : '',
      items: gifs,
      skeletons: skeletonsPerColumn(loading),
      kind: 'feed',
    });
  }

  return sections;
};

/**
 * GIF из записей недавних; записи стикеров пропускаются.
 *
 * @param records — записи недавних, свежие первыми
 * @returns GIF в порядке записей
 */
export const recentGifs = (records: RecentRec[]): RemoteGif[] => {
  return records.reduce<RemoteGif[]>((acc, { item }) => {
    if (item.kind === 'remote') acc.push(item.gif);

    return acc;
  }, []);
};
