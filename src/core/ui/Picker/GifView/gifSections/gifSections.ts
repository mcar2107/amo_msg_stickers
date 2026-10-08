import type { RecentRec, RemoteGif } from '../../../../db.types';
import { t } from '../../../../i18n/translate';
import type { GifSection } from '../../MasonryGrid/MasonryGrid.types';
import { COLUMN_COUNT } from '../../MasonryGrid/tileBox/tileBox';
import type { FeedLoading } from '../../useGifFeed/useGifFeed.types';

import type { GifSectionsInput } from './gifSections.types';

/**
 * id раздела недавних GIF. Он входит в id кнопки ячейки (`gifCellId`), и по нему же ячейку ищет
 * фокус после «Убрать из недавних» (`useGifRemovalFocus`).
 */
export const RECENT_GIF_SECTION_ID = 'recent';

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
 * Разделы ленты режима «GIF». Недавние стоят над трендами, но не над результатами поиска:
 * при непустом запросе пользователь ищет конкретное. Без ключей выдачи нет, а недавние
 * остаются — их отправка источнику не нужна.
 *
 * Пока выдача грузится, в конце её раздела стоят заглушки.
 *
 * @param input — недавние, выдача, её запрос, загрузка и наличие источника
 * @returns разделы сверху вниз
 */
export const gifSections = (input: GifSectionsInput): GifSection[] => {
  const { recent, gifs, term, hasFeed, loading } = input;
  const hasRecent = recent.length > 0 && !term;
  const sections: GifSection[] = [];

  if (hasRecent)
    sections.push({
      id: RECENT_GIF_SECTION_ID,
      title: t('gifs.recent'),
      items: recent,
      skeletons: 0,
      isRecent: true,
    });

  /**
   * Заголовок трендов нужен только под недавними — отделить одну выдачу от другой. Одна
   * выдача без недавних идёт без заголовка, как и результаты поиска.
   */
  if (hasFeed) {
    sections.push({
      id: 'feed',
      title: hasRecent ? t('gifs.trends') : '',
      items: gifs,
      skeletons: skeletonsPerColumn(loading),
      isRecent: false,
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
