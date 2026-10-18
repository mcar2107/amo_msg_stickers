import type { PendingFocus } from './useRemovalFocus.types';

/**
 * Пора ли применить цели фокуса к показанной ленте. Удаление ждёт любую новую ленту, правка —
 * ленту из новых данных: лента из прежних данных — чужая перестройка между выбором пункта и
 * ответом базы, и цели правки остаются ждать.
 *
 * @param pending — ожидание фокуса
 * @param feed — показанная лента
 * @param revision — данные правки, из которых собрана лента
 * @returns `true` — лента та, к которой относятся цели
 */
export const isPendingDue = <T>(
  pending: PendingFocus<T>,
  feed: T,
  revision: unknown
): boolean => {
  if (feed === pending.feed) return false;

  return !pending.shouldWaitRevision || revision !== pending.revision;
};
