import { createContext } from 'preact';

import type { FavoritesContextValue } from './useFavorites.types';

/**
 * `null` — значение вне `PickerProvider`: `useFavoritesContext` превращает его в исключение.
 */
export const FavoritesContext = createContext<FavoritesContextValue | null>(null);
