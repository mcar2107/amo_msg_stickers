import type { SendItem } from '../../../../../db.types';

export type FavoriteItemProps = {
  /**
   * Элемент ячейки: по его ключу пункт узнаёт, в избранном ли он.
   */
  item: SendItem;

  /**
   * Колбэк на выбор пункта — после закрытия меню.
   */
  onToggle: () => void;
};
