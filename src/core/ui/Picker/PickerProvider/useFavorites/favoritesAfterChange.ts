import type { FavoriteRec } from '@core/db.types';

/**
 * Избранное после записи в базу. Запись по ключу заменяет прежнюю, как в базе, поэтому повторное добавление не
 * дублирует элемент, а поднимает его наверх: у новой записи самое позднее время.
 *
 * @param prev — избранное до правки; `null` — ещё не прочитано
 * @param key — ключ правленого элемента
 * @param added — записанная запись; `null` — элемент убран
 * @returns новый список от новых к старым
 */
export const favoritesAfterChange = (
  prev: FavoriteRec[] | null,
  key: string,
  added: FavoriteRec | null
): FavoriteRec[] => {
  const rest = (prev || []).filter((record) => {
    return record.key !== key;
  });

  return added ? [added, ...rest] : rest;
};
