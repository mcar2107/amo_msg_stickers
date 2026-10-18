import type { FunctionComponent as FC } from 'preact';

import { itemKey } from '../../../../../db';
import { t } from '../../../../../i18n/translate';
import { useFavoritesContext } from '../../../PickerProvider/useFavorites/useFavoritesContext';
import { MenuItem } from '../../MenuItem/MenuItem';
import { useMenuClose } from '../../useMenuClose/useMenuClose';

import type { FavoriteItemProps } from './FavoriteItem.types';

/**
 * Пункт меню ячейки, добавляющий её элемент в избранное или убирающий из него. Состояние читает сам из контекста
 * избранного: пункт смонтирован, только пока меню открыто, и ячейкам не нужно знать ключи избранного. Без
 * подтверждения: правку отменяет повторный выбор того же пункта.
 */
export const FavoriteItem: FC<FavoriteItemProps> = (props) => {
  const { item, onToggle } = props;
  const { keys } = useFavoritesContext();
  const closeMenu = useMenuClose();
  const isFavorite = keys.has(itemKey(item));

  const handleItemSelect = () => {
    closeMenu();
    onToggle();
  };

  return (
    <MenuItem onSelect={handleItemSelect}>
      {t(isFavorite ? 'menu.removeFavorite' : 'menu.addFavorite')}
    </MenuItem>
  );
};
