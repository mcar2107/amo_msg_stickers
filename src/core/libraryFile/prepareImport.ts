import { inspectGif } from '../gif';
import { t } from '../i18n/translate';
import { readZipEntry } from '../zip/zipRead';

import { MAX_STICKER_BYTES } from './limits';
import type { ManifestPack, ManifestSticker } from './manifest.types';
import type {
  ImportPlan,
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
  let blob: Blob;
  let bytes: Uint8Array;

  try {
    blob = await readZipEntry(libraryFile.file, entry, {
      maxBytes: MAX_STICKER_BYTES,
      type: GIF_TYPE,
    });
    bytes = new Uint8Array(await blob.arrayBuffer());
  } catch (error) {
    throw toFileError(error);
  }

  /**
   * Стороны — логический экран из заголовка GIF, а не из недоверенного описания.
   */
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
 * Проверяет новые стикеры карточки по одному и собирает план импорта, ничего не записывая в базу. GIF без сжатия в
 * плане — срез файла без копии в память, после сжатия архиватором — распакованные байты.
 *
 * Отмена проверяется перед каждым стикером и после последнего: отменённая подготовка не доходит до записи. Ошибка
 * любого стикера останавливает подготовку.
 *
 * @param libraryFile — прочитанный файл
 * @param card — карточка этого файла по свежему состоянию библиотеки
 * @param options — отмена и ход проверки
 * @returns план: паки в порядке файла, в которые добавляется хоть один стикер; отмена — `signal.reason`
 */
export const prepareImport = async (
  libraryFile: LibraryFile,
  card: FileCard,
  options: PrepareImportOptions = {}
): Promise<ImportPlan> => {
  const { signal, onProgress } = options;
  const total = card.newStickerCount;
  const packs: ImportPlanPack[] = [];
  let done = 0;

  onProgress?.({ done, total });

  for (const { pack, newStickers } of card.packs) {
    if (!newStickers.length) continue;
    const stickers: ImportPlanSticker[] = [];

    for (const sticker of newStickers) {
      signal?.throwIfAborted();
      stickers.push(await checkSticker(libraryFile, sticker));
      done += 1;
      onProgress?.({ done, total });
    }

    packs.push(toPlanPack(pack, stickers));
  }

  signal?.throwIfAborted();

  return { packs };
};
