import type { FavoriteRec, Pack, StickerRec } from '@core/db.types';
import { itemKey } from '@core/itemKey';
import type {
  ImportPlan,
  ImportPlanFavorite,
  ImportPlanPack,
  ImportPlanSnapshot,
  ImportPlanSticker,
  ManifestRecent,
} from '@core/libraryFile';
import { mergeRecent, toSendItem } from '@core/libraryFile/mergeRecent';

import type {
  ImportLibrary,
  ImportRecords,
  ImportRecordsOptions,
} from './importRecords.types';

/**
 * Запись нового пака из файла. Обложка всегда задана: та, что в файле, если её стикер записывается, иначе первый
 * записываемый — обложка из файла могла указать на стикер, занятый в библиотеке другим паком.
 *
 * @param pack — пак плана
 * @param stickers — стикеры пака, которые будут записаны; хотя бы один
 * @param startedAt — время начала записи: время добавления пака без него в файле
 * @returns запись пака
 */
const newPackRecord = (
  pack: ImportPlanPack,
  stickers: ImportPlanSticker[],
  startedAt: number
): Pack => {
  const { id, title, source, sourceRef, createdAt, usedAt, coverId } = pack;
  const cover =
    stickers.find((sticker) => {
      return sticker.id === coverId;
    }) || stickers[0];

  return {
    id,
    title,
    source,
    ...(sourceRef === undefined ? {} : { sourceRef }),
    createdAt: createdAt === undefined ? startedAt : createdAt,
    ...(usedAt === undefined ? {} : { usedAt }),
    coverId: cover?.id || '',
  };
};

/**
 * @param item — элемент избранного плана
 * @returns true — стикер несёт свой проверенный GIF
 */
const isPlanSnapshot = (item: ImportPlanFavorite): item is ImportPlanSnapshot => {
  return 'sticker' in item;
};

/**
 * Запись стикера из снимка файла: в паки она не пишется и живёт только в записи избранного.
 *
 * @param snapshot — снимок плана
 * @param startedAt — время начала записи: время добавления снимка, которого в файле нет
 * @returns снимок записи стикера
 */
const snapshotRecord = (snapshot: ImportPlanSnapshot, startedAt: number): StickerRec => {
  const { packId, sticker } = snapshot;
  const { id, blob, width, height, emoji, caption } = sticker;

  return {
    id,
    packId,
    blob,
    width,
    height,
    ...(emoji === undefined ? {} : { emoji }),
    ...(caption === undefined ? {} : { caption }),
    createdAt: startedAt,
  };
};

/**
 * Снимок стикера — запись из этой же транзакции: записываемая, иначе прочитанная из библиотеки, иначе GIF из файла.
 * Запись библиотеки важнее GIF из файла: стикер с этим id уже показывается в своём паке, и избранное показывает то же.
 *
 * @param item — элемент избранного плана
 * @param written — записываемые стикеры по id
 * @param library — состояние библиотеки в момент записи
 * @param startedAt — время начала записи
 * @returns запись избранного; undefined — у ссылки нет записи стикера (его удалили после карточки), показывать и
 * отправлять было бы нечего
 */
const favoriteRecord = (
  item: ImportPlanFavorite,
  written: ReadonlyMap<string, StickerRec>,
  library: ImportLibrary,
  startedAt: number
): FavoriteRec | undefined => {
  const sendItem = toSendItem(item);
  const key = itemKey(sendItem);
  const { ts } = item;

  switch (sendItem.kind) {
    case 'remote': {
      return { key, ts, item: sendItem };
    }

    case 'local': {
      const { stickerId } = sendItem;
      const sticker =
        written.get(stickerId) ||
        library.favoriteStickers.get(stickerId) ||
        (isPlanSnapshot(item) ? snapshotRecord(item, startedAt) : undefined);

      return sticker && { key, ts, item: sendItem, sticker };
    }

    default: {
      const unknownItem: never = sendItem;

      throw new Error(`Unknown send item: ${JSON.stringify(unknownItem)}`);
    }
  }
};

/**
 * Ключи сверяются с избранным на момент записи, а не карточки: элемент, добавленный в избранное после неё, не
 * меняется.
 *
 * @param favorites — избранное плана
 * @param written — записываемые стикеры по id
 * @param library — состояние библиотеки в момент записи
 * @param startedAt — время начала записи
 * @returns записи избранного для ключей, которых в избранном нет, в порядке плана
 */
const favoriteRecords = (
  favorites: readonly ImportPlanFavorite[],
  written: ReadonlyMap<string, StickerRec>,
  library: ImportLibrary,
  startedAt: number
): FavoriteRec[] => {
  const takenKeys = new Set(library.favoriteKeys);

  return favorites.reduce<FavoriteRec[]>((acc, item) => {
    const rec = favoriteRecord(item, written, library, startedAt);

    if (rec && !takenKeys.has(rec.key)) {
      takenKeys.add(rec.key);
      acc.push(rec);
    }

    return acc;
  }, []);
};

/**
 * @param recent — недавние плана
 * @param stickerIds — id стикеров библиотеки после записи
 * @returns недавние, стикер которых после записи есть в библиотеке; GIF — все
 */
const presentRecent = (
  recent: readonly ManifestRecent[],
  stickerIds: ReadonlySet<string>
) => {
  return recent.filter((item) => {
    return item.kind === 'gif' || stickerIds.has(item.id);
  });
};

/**
 * Строит записи импорта по состоянию библиотеки в момент записи, а не карточки: пак, удалённый после карточки,
 * создаётся заново, стикер, появившийся после неё, не перезаписывается. Пак, который уже есть, не пишется — его
 * название, обложка и время использования не меняются; его новые стикеры встают после всех прежних. Пак, в который не
 * добавляется ни одного стикера, пропускается.
 *
 * Время добавления стикеров считается от последнего стикера пака в библиотеке, а не от часов: прошлый импорт мог дать
 * стикеры новее `startedAt`, а часы — уйти назад, и новые встали бы между прежними.
 *
 * Свой пак, которого нет, создаётся записью `customPack`, а не полями из файла: файл мог выгрузить другой человек, а
 * «Мои стикеры» у всех первые и называются на языке интерфейса.
 *
 * Избранное только добавляется: элемент, который в избранном есть, не меняется. Недавние сливаются с недавними на момент
 * записи тем же `mergeRecent`, что считает карточку; недавний стикер, которого после записи нет в библиотеке, не
 * добавляется.
 *
 * @param plan — проверенный план импорта
 * @param library — состояние библиотеки в момент записи
 * @param options — время начала записи и запись своего пака
 * @returns записи паков, стикеров, избранного и недавних, ключи недавних сверх лимита и итог записи
 */
export const buildImportRecords = (
  plan: ImportPlan,
  library: ImportLibrary,
  options: ImportRecordsOptions
): ImportRecords => {
  const { packIds, stickerIds, lastStickerAt } = library;
  const { startedAt, customPack } = options;
  const takenIds = new Set(stickerIds);
  const records: ImportRecords = {
    packs: [],
    stickers: [],
    favorites: [],
    recent: [],
    recentDeleteKeys: [],
    written: {
      packIds: [],
      stickerCount: 0,
      favoriteCount: 0,
      recentCount: 0,
      hasFavoriteStickers: false,
      hasRecentStickers: false,
    },
  };

  for (const pack of plan.packs) {
    const stickers = pack.stickers.filter(({ id }) => {
      return !takenIds.has(id);
    });

    if (!stickers.length) continue;
    const last = lastStickerAt.get(pack.id);
    const firstAt = last === undefined ? startedAt : last + 1;

    if (!packIds.has(pack.id)) {
      records.packs.push(
        pack.source === 'custom' ? customPack : newPackRecord(pack, stickers, startedAt)
      );
    }

    stickers.forEach(({ id, blob, width, height, emoji, caption }, index) => {
      const sticker: StickerRec = {
        id,
        packId: pack.id,
        blob,
        width,
        height,
        ...(emoji === undefined ? {} : { emoji }),
        ...(caption === undefined ? {} : { caption }),
        createdAt: firstAt + index,
      };

      takenIds.add(id);
      records.stickers.push(sticker);
    });
    records.written.packIds.push(pack.id);
    records.written.stickerCount += stickers.length;
  }

  const written = new Map(
    records.stickers.map((sticker) => {
      return [sticker.id, sticker];
    })
  );

  records.favorites = favoriteRecords(plan.favorites, written, library, startedAt);
  const { put, deleteKeys } = mergeRecent(
    library.recent,
    presentRecent(plan.recent, takenIds)
  );

  records.recent = put;
  records.recentDeleteKeys = deleteKeys;
  records.written.favoriteCount = records.favorites.length;
  records.written.recentCount = put.length;
  records.written.hasFavoriteStickers = records.favorites.some(({ item }) => {
    return item.kind === 'local';
  });
  records.written.hasRecentStickers = put.some(({ item }) => {
    return item.kind === 'local';
  });

  return records;
};
