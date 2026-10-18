import type { FavoriteToggle } from '@ui/PickerProvider/useFavorites';
import type { StickerRow } from '@ui/stickerLayout';
import type { FeedSticker } from '@ui/StickersMode/feedSections';

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
