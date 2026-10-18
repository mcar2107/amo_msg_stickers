import type { Pack, StickerRec } from '@core/db.types';
import type { ImportPlan, ImportPlanPack, ImportPlanSticker } from '@core/libraryFile';

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
 * @param plan — проверенный план импорта
 * @param library — состояние библиотеки в момент записи
 * @param options — время начала записи и запись своего пака
 * @returns записи паков и стикеров и итог записи
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
    written: { packIds: [], stickerCount: 0 },
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

  return records;
};
