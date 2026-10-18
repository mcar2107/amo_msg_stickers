import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

import { deleteFavorite, itemKey, listFavorites, putFavorite } from '@core/db';
import type { FavoriteRec, SendItem, StickerRec } from '@core/db.types';
import { t } from '@core/i18n';
import { errorMessage } from '@ui/PickerProvider/errorMessage';

import { favoritesAfterChange } from './favoritesAfterChange';
import type { FavoritesContextValue, FavoritesOptions } from './useFavorites.types';

/**
 * Состояние `FavoritesContext`. Методы стабильны между рендерами.
 *
 * Последнее избранное держит ещё и `ref`: правка решает, добавлять или убирать, по состоянию на момент выбора, а
 * применяется к состоянию на момент ответа базы — правка, завершившаяся между ними, не теряется.
 *
 * @param options — показ статуса и ошибки
 * @returns значение `FavoritesContext`
 */
export const useFavorites = (options: FavoritesOptions): FavoritesContextValue => {
  const { showStatus, showError } = options;
  const [favorites, setFavorites] = useState<FavoriteRec[] | null>(null);
  const favoritesRef = useRef<FavoriteRec[] | null>(null);

  const commit = useCallback((next: FavoriteRec[]) => {
    favoritesRef.current = next;
    setFavorites(next);
  }, []);

  const refreshFavorites = useCallback(async () => {
    try {
      commit(await listFavorites());
    } catch (error) {
      commit(favoritesRef.current || []);

      throw error;
    }
  }, [commit]);

  const toggleFavorite = useCallback(
    async (item: SendItem, sticker?: StickerRec) => {
      const key = itemKey(item);
      const isFavorite = Boolean(
        favoritesRef.current?.some((record) => {
          return record.key === key;
        })
      );

      try {
        if (isFavorite) {
          await deleteFavorite(item);
          commit(favoritesAfterChange(favoritesRef.current, key, null));
          showStatus(t('status.favoriteRemoved'));
        } else {
          const added = await putFavorite(item, sticker);

          commit(favoritesAfterChange(favoritesRef.current, key, added));
          showStatus(t('status.favoriteAdded'));
        }

        return true;
      } catch (error) {
        showError(errorMessage(error));

        return false;
      }
    },
    [commit, showStatus, showError]
  );

  const keys = useMemo(() => {
    return new Set(
      (favorites || []).map((record) => {
        return record.key;
      })
    );
  }, [favorites]);

  return useMemo(() => {
    return { favorites, keys, refreshFavorites, toggleFavorite };
  }, [favorites, keys, refreshFavorites, toggleFavorite]);
};
