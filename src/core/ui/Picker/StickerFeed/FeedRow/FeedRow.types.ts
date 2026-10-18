import type { FavoriteToggle } from '../../PickerProvider/useFavorites/useFavorites.types';
import type { StickerRow } from '../../stickerLayout/stickerLayout.types';
import type { FeedSticker } from '../../StickersMode/feedSections/feedSections.types';

export type FeedRowProps = {
  /**
   * Ряд ячеек раскладки с готовой геометрией.
   */
  row: StickerRow<FeedSticker>;

  /**
   * Подсказка пустого раздела — текст ряда ячеек без стикеров.
   */
  hint: string;

  /**
   * Колбэк на удаление элемента ячейки: стикера из пака или элемента из недавних — по разделу
   * ряда. У ряда «Избранного» пункта удаления нет, и колбэк не зовётся.
   */
  onCellDelete: (cell: FeedSticker) => void;

  /**
   * Колбэк на выбор пункта избранного в меню ячейки ряда.
   */
  onFavoriteToggle: (toggle: FavoriteToggle) => void;
};
