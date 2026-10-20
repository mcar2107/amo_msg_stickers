import type { RecentRec } from '@core/db.types';
import { itemKey, keepNewestByKind, recentKindOf } from '@core/itemKey';
import type { ManifestRecent } from '@core/libraryFile';

import type { RecentMerge } from './mergeRecent.types';
import { toSendItem } from './toSendItem';

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

  const recs = Array.from(byKey.values(), ({ rec }) => {
    return rec;
  });
  const { kept, overflow } = keepNewestByKind(recs, (rec) => {
    return recentKindOf(rec.item);
  });
  const merge: RecentMerge = { put: [], deleteKeys: [], added: [] };

  for (const rec of kept) {
    const item = byKey.get(rec.key)?.incoming;

    if (item) {
      merge.put.push(rec);
      merge.added.push(item);
    }
  }

  for (const { key } of overflow) {
    if (byKey.get(key)?.isInLibrary) merge.deleteKeys.push(key);
  }

  return merge;
};
