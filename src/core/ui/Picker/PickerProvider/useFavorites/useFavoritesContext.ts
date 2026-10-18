import { useContext } from 'preact/hooks';

import { FavoritesContext } from './FavoritesContext';
import type { FavoritesContextValue } from './useFavorites.types';

/**
 * Избранное пикера: записи, их ключи, перечитывание и правка. Контекст отдельный от `usePicker`: состояние читают
 * пункт меню и разделы ленты, а не каждая ячейка пропом.
 *
 * @returns значение `FavoritesContext` провайдера
 */
export const useFavoritesContext = (): FavoritesContextValue => {
  const value = useContext(FavoritesContext);

  if (!value) throw new Error('useFavoritesContext вызван вне PickerProvider');

  return value;
};
