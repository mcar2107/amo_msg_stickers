import { inspectGif } from '@core/gif';
import { t } from '@core/i18n';
import type { ZipEntryContent } from '@core/zip';
import { readZipEntry } from '@core/zip';

import { MAX_STICKER_BYTES } from './limits';
import type { ManifestFavorite, ManifestPack, ManifestSticker } from './manifest.types';
import { isManifestSnapshot } from './manifest.types';
import type {
  ImportPlan,
  ImportPlanFavorite,
  ImportPlanPack,
  ImportPlanSticker,
  PrepareImportOptions,
} from './prepareImport.types';
import { toFileError } from './readLibraryFile';
import type { FileCard, LibraryFile } from './readLibraryFile.types';

const GIF_TYPE = 'image/gif';

/**
 * Читает и проверяет GIF одного стикера: CRC архива, предел размера и разбор GIF. Порчу внутри LZW-данных разбор GIF
 * не видит — её ловит CRC.
 *
 * @param libraryFile — прочитанный файл
 * @param sticker — стикер из описания
 * @returns стикер плана со сторонами из заголовка GIF
 */
const checkSticker = async (
  libraryFile: LibraryFile,
  sticker: ManifestSticker
): Promise<ImportPlanSticker> => {
  const { id, emoji, caption } = sticker;
  const entry = libraryFile.entries.get(id);

  if (!entry) throw new Error(t('error.libraryFile.broken'));
  let content: ZipEntryContent;

  try {
    content = await readZipEntry(libraryFile.file, entry, {
      maxBytes: MAX_STICKER_BYTES,
      type: GIF_TYPE,
    });
  } catch (error) {
    throw toFileError(error);
  }

  /**
   * Стороны — логический экран из заголовка GIF, а не из недоверенного описания.
   */
  const { blob, bytes } = content;
  const info = inspectGif(bytes);

  if (!info) throw new Error(t('error.libraryFile.broken'));

  return {
    id,
    blob,
    width: info.width,
    height: info.height,
    ...(emoji === undefined ? {} : { emoji }),
    ...(caption === undefined ? {} : { caption }),
  };
};

/**
 * @param pack — пак из описания
 * @param stickers — его проверенные новые стикеры
 * @returns пак плана
 */
const toPlanPack = (
  pack: ManifestPack,
  stickers: ImportPlanSticker[]
): ImportPlanPack => {
  const { id, source, title, sourceRef, createdAt, usedAt, coverId } = pack;

  return {
    id,
    source,
    title,
    ...(sourceRef === undefined ? {} : { sourceRef }),
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(usedAt === undefined ? {} : { usedAt }),
    ...(coverId === undefined ? {} : { coverId }),
    stickers,
  };
};

/**
 * @param favorites — новое избранное карточки
 * @returns сколько в нём стикеров со своим GIF
 */
const countSnapshots = (favorites: readonly ManifestFavorite[]) => {
  return favorites.reduce((count, item) => {
    return isManifestSnapshot(item) ? count + 1 : count;
  }, 0);
};

/**
 * Сколько GIF проверит подготовка импорта: новые стикеры паков и снимки нового избранного. Ход проверки и его полоса до
 * первого шага считают от этого числа.
 *
 * @param card — карточка файла
 * @returns число проверяемых GIF
 */
export const fileCardCheckCount = (card: FileCard): number => {
  return card.newStickerCount + countSnapshots(card.newFavorites);
};

/**
 * Проверяет новые стикеры карточки, затем GIF снимков её нового избранного по одному и собирает план импорта, ничего не
 * записывая в базу. GIF без сжатия в плане — срез файла без копии в память, после сжатия архиватором — распакованные
 * байты.
 *
 * Отмена проверяется перед каждым стикером и снимком и после последнего: отменённая подготовка не доходит до записи.
 * Ошибка любого GIF останавливает подготовку.
 *
 * @param libraryFile — прочитанный файл
 * @param card — карточка этого файла по свежему состоянию библиотеки
 * @param options — отмена и ход проверки
 * @returns план: паки в порядке файла, в которые добавляется хоть один стикер, новое избранное карточки и недавние
 * файла; отмена — `signal.reason`
 */
export const prepareImport = async (
  libraryFile: LibraryFile,
  card: FileCard,
  options: PrepareImportOptions = {}
): Promise<ImportPlan> => {
  const { signal, onProgress } = options;
  const total = fileCardCheckCount(card);
  const packs: ImportPlanPack[] = [];
  const favorites: ImportPlanFavorite[] = [];
  let done = 0;

  /**
   * @param sticker — стикер пака или снимок избранного
   * @returns проверенный стикер плана
   */
  const check = async (sticker: ManifestSticker) => {
    signal?.throwIfAborted();
    const checked = await checkSticker(libraryFile, sticker);

    done += 1;
    onProgress?.({ done, total });

    return checked;
  };

  onProgress?.({ done, total });

  for (const { pack, newStickers } of card.packs) {
    if (!newStickers.length) continue;
    const stickers: ImportPlanSticker[] = [];

    for (const sticker of newStickers) stickers.push(await check(sticker));
    packs.push(toPlanPack(pack, stickers));
  }

  for (const item of card.newFavorites) {
    if (isManifestSnapshot(item)) {
      const { kind, id, ts, packId } = item;

      favorites.push({ kind, id, ts, packId, sticker: await check(item) });
    } else {
      favorites.push(item);
    }
  }

  signal?.throwIfAborted();

  return { packs, favorites, recent: libraryFile.manifest.recent || [] };
};
