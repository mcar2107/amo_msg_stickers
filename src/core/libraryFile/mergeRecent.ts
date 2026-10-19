import type { RecentKind, RecentRec } from '@core/db.types';
import { itemKey, RECENT_LIMIT, recentKindOf } from '@core/itemKey';

import type { ManifestRecent } from './manifest.types';
import { toSendItem } from './manifest.types';
import type { RecentMerge } from './mergeRecent.types';

/**
 * Претендент на место в недавних после слияния.
 */
type Candidate = {
  /**
   * Запись недавних: прежняя или из файла.
   */
  rec: RecentRec;

  /**
   * Элемент файла, из которого сделана запись. undefined — запись библиотеки.
   */
  incoming?: ManifestRecent;

  /**
   * Ключ есть в недавних библиотеки: вытесненный лимитом, он удаляется, даже если его переписал элемент файла.
   */
  isInLibrary: boolean;
};

/**
 * Сливает недавние файла с недавними библиотеки по ключу элемента: у элемента, который есть в обоих, остаётся более
 * позднее время, при равном — запись библиотеки. Лимит считается по виду: GIF из файла не вытесняют стикеры, и
 * наоборот. Одна и та же функция считает карточку файла и запись импорта, поэтому карточка обещает ровно то, что
 * запишется.
 *
 * @param existing — недавние библиотеки обоих видов
 * @param incoming — недавние файла обоих видов
 * @returns что записать, какие ключи удалить и какие элементы файла добавятся
 */
export const mergeRecent = (
  existing: readonly RecentRec[],
  incoming: readonly ManifestRecent[]
): RecentMerge => {
  const byKey = new Map<string, Candidate>();

  for (const rec of existing) byKey.set(rec.key, { rec, isInLibrary: true });

  for (const item of incoming) {
    const sendItem = toSendItem(item);
    const key = itemKey(sendItem);
    const current = byKey.get(key);

    if (!current || item.ts > current.rec.ts) {
      byKey.set(key, {
        rec: { key, ts: item.ts, item: sendItem },
        incoming: item,
        isInLibrary: !!current,
      });
    }
  }

  const byTime = [...byKey.values()].sort((a, b) => {
    return b.rec.ts - a.rec.ts;
  });
  const counts: Record<RecentKind, number> = { sticker: 0, gif: 0 };

  return byTime.reduce<RecentMerge>(
    (acc, { rec, incoming: item, isInLibrary }) => {
      const kind = recentKindOf(rec.item);
      const isKept = counts[kind] < RECENT_LIMIT;

      counts[kind] += 1;

      if (item && isKept) {
        acc.put.push(rec);
        acc.added.push(item);
      }

      if (!isKept && isInLibrary) acc.deleteKeys.push(rec.key);

      return acc;
    },
    { put: [], deleteKeys: [], added: [] }
  );
};
