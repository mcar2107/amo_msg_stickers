import type { RemoteGif } from '@core/db.types';
import type { KeptScroll } from '@ui/keptScrollTop/createKeptScroll';
import type { FavoriteToggle } from '@ui/PickerProvider/useFavorites';

/**
 * Раздел ленты GIF.
 */
export type GifSection = {
  /**
   * Идентификатор раздела, уникальный в ленте.
   */
  id: string;

  /**
   * Название в строке заголовка над колонками; пустая строка — раздел без заголовка.
   */
  title: string;

  /**
   * GIF раздела в порядке выдачи.
   */
  items: RemoteGif[];

  /**
   * Сколько заглушек положить в конец каждой колонки раздела: выдача ещё грузится.
   */
  skeletons: number;

  /**
   * Вид раздела. У недавних в заголовке «Очистить», у ячеек — меню «Убрать из недавних». Найденные
   * GIF не хранятся, и убирать их неоткуда, а избранную GIF убирает пункт избранного.
   */
  kind: GifSectionKind;
};

/**
 * Вид раздела ленты GIF: избранное, недавние или выдача источника.
 */
type GifSectionKind = 'favorite' | 'recent' | 'feed';

export type MasonryGridProps = {
  /**
   * Разделы ленты сверху вниз.
   */
  sections: GifSection[];

  /**
   * Номер сброса выдачи: его смена прокручивает ленту к началу.
   */
  resetKey: number;

  /**
   * Удержание места ленты на время правки избранного: метку ставит и снимает режим, а прокрутку
   * для новой раскладки ставит лента.
   */
  keptScroll: KeptScroll;

  /**
   * Ленту прокрутили: по положению прокручиваемого элемента решается подгрузка страницы.
   */
  onScroll: (element: HTMLElement) => void;

  /**
   * Колбэк на выбор «Убрать из недавних» в меню ячейки раздела недавних.
   */
  onRecentRemove: (gif: RemoteGif) => void;

  /**
   * Колбэк на выбор пункта избранного в меню ячейки любого раздела.
   */
  onFavoriteToggle: (toggle: FavoriteToggle) => void;

  /**
   * Колбэк на подтверждённую очистку недавних GIF из заголовка их раздела.
   */
  onRecentClear: () => void;
};
