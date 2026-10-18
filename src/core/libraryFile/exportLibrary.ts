import { getPack, listAllStickers, listPacks, listStickers } from '../db';
import type { StickerRec } from '../db.types';
import { t } from '../i18n/translate';
import { BYTES_IN_MB } from '../net';
import { orderPacks } from '../packOrder';
import { packTitle } from '../packTitle';
import type { ZipWriteEntry } from '../zip/zip.types';
import { ZipError } from '../zip/zipError';
import { writeZip } from '../zip/zipWrite';

import { libraryFileName, packFileName } from './exportFileName';
import type { ExportOptions, ExportPack, LibraryExport } from './exportLibrary.types';
import {
  clampGraphemes,
  FORMAT_NAME,
  FORMAT_VERSION,
  MANIFEST_FILE,
  MAX_CAPTION_GRAPHEMES,
  MAX_EMOJI_GRAPHEMES,
  MAX_FILE_STICKERS,
  MAX_STICKER_BYTES,
  MAX_TITLE_GRAPHEMES,
} from './limits';
import type { LibraryManifest, ManifestPack, ManifestSticker } from './manifest.types';
import { parseManifest } from './manifest.types';

/**
 * Каталог GIF в архиве. Имена записей — только ASCII: архиватор macOS не распаковывает запись с не-ASCII именем.
 */
const STICKERS_DIR = 'stickers/';

/**
 * Файл не помещается в пределы формата.
 *
 * @param isLibrary — выгружается вся библиотека, а не пак
 * @returns ошибка: библиотеке — с советом выгружать паки по одному
 */
const tooBigError = (isLibrary: boolean) => {
  const params = { max: MAX_FILE_STICKERS };

  if (isLibrary) return new Error(t('error.libraryFile.exportTooBig', params));

  return new Error(t('error.libraryFile.packTooBig', params));
};

/**
 * Выгружать нечего: кнопка и пункт меню у пустой библиотеки и пустого пака недоступны, и сюда доходит только гонка
 * с удалением.
 *
 * @param isLibrary — выгружается вся библиотека, а не пак
 * @returns ошибка
 */
const emptyError = (isLibrary: boolean) => {
  if (isLibrary) return new Error(t('error.libraryFile.libraryExportEmpty'));

  return new Error(t('error.libraryFile.packExportEmpty'));
};

/**
 * Паки выгрузки в порядке ленты без снимка — порядок, в котором их увидит пользователь при открытии попапа, —
 * без пустых паков.
 *
 * @param packId — пак; undefined — вся библиотека
 * @returns паки со стикерами
 */
const loadPacks = async (packId: string | undefined): Promise<ExportPack[]> => {
  if (packId !== undefined) {
    const [pack, stickers] = await Promise.all([getPack(packId), listStickers(packId)]);

    return pack && stickers.length ? [{ pack, stickers }] : [];
  }

  const [packs, stickersByPack] = await Promise.all([listPacks(), listAllStickers()]);

  return orderPacks(packs, null).reduce<ExportPack[]>((acc, pack) => {
    const stickers = stickersByPack.get(pack.id);

    if (stickers?.length) acc.push({ pack, stickers });

    return acc;
  }, []);
};

/**
 * Пределы формата до сборки архива: файл, который не прочитать, не сохраняется вовсе.
 *
 * @param packs — паки выгрузки
 * @param isLibrary — выгружается вся библиотека
 * @returns число стикеров
 */
const checkLimits = (packs: ExportPack[], isLibrary: boolean) => {
  let count = 0;

  for (const { stickers } of packs) count += stickers.length;
  if (!count) throw emptyError(isLibrary);
  if (count > MAX_FILE_STICKERS) throw tooBigError(isLibrary);

  for (const { pack, stickers } of packs) {
    const isTooHeavy = stickers.some(({ blob }) => {
      return blob.size > MAX_STICKER_BYTES;
    });

    if (isTooHeavy) {
      throw new Error(
        t('error.libraryFile.gifTooBig', {
          title: packTitle(pack),
          size: MAX_STICKER_BYTES / BYTES_IN_MB,
        })
      );
    }
  }

  return count;
};

/**
 * Пустая строка после урезания — то же, что отсутствие: чтение так же её отбрасывает.
 *
 * @param text — эмодзи или подпись
 * @param maxGraphemes — предел формата
 * @returns урезанная строка; undefined — строки нет
 */
const clampOptional = (text: string | undefined, maxGraphemes: number) => {
  return text ? clampGraphemes(text, maxGraphemes) || undefined : undefined;
};

/**
 * @param sticker — запись стикера
 * @param file — путь его GIF в архиве
 * @returns стикер описания: без сторон и времени — их загрузка берёт из GIF и задаёт заново
 */
const toManifestSticker = (sticker: StickerRec, file: string): ManifestSticker => {
  const emoji = clampOptional(sticker.emoji, MAX_EMOJI_GRAPHEMES);
  const caption = clampOptional(sticker.caption, MAX_CAPTION_GRAPHEMES);

  return {
    id: sticker.id,
    file,
    ...(emoji === undefined ? {} : { emoji }),
    ...(caption === undefined ? {} : { caption }),
  };
};

/**
 * Описание и записи GIF архива. Время пака — только в выгрузке библиотеки: выгрузку пака пересылают другим людям, и
 * она не раскрывает, когда из пака отправляли. Обложка — только стикер, который есть в паке.
 *
 * @param packs — паки выгрузки
 * @param isLibrary — выгружается вся библиотека
 * @returns описание и записи GIF в порядке описания
 */
const buildManifest = (packs: ExportPack[], isLibrary: boolean) => {
  const entries: ZipWriteEntry[] = [];

  const manifestPacks = packs.map<ManifestPack>(({ pack, stickers }) => {
    const { id, source, title, sourceRef, coverId, createdAt, usedAt } = pack;
    const hasCover = stickers.some((sticker) => {
      return sticker.id === coverId;
    });

    const manifestStickers = stickers.map((sticker) => {
      const file = `${STICKERS_DIR}${entries.length}.gif`;

      entries.push({ name: file, data: sticker.blob });

      return toManifestSticker(sticker, file);
    });

    return {
      id,
      source,
      title: clampGraphemes(title, MAX_TITLE_GRAPHEMES),
      ...(source === 'telegram' && sourceRef ? { sourceRef } : {}),
      ...(isLibrary ? { createdAt } : {}),
      ...(isLibrary && usedAt !== undefined ? { usedAt } : {}),
      ...(hasCover && coverId ? { coverId } : {}),
      stickers: manifestStickers,
    };
  });

  const manifest: LibraryManifest = {
    format: FORMAT_NAME,
    version: FORMAT_VERSION,
    packs: manifestPacks,
  };

  return { manifest, entries };
};

/**
 * Прогоняет текст описания через гард чтения: выгрузка не сохраняет то, чего не прочитает. Отказ возможен только у
 * записи базы не того вида, что пишет amo stickers.
 *
 * @param text — `manifest.json`
 * @param isLibrary — выгружается вся библиотека
 */
const checkManifest = (text: string, isLibrary: boolean) => {
  const result = parseManifest(JSON.parse(text));

  if (!('error' in result)) return;

  switch (result.error) {
    case 'tooBig': {
      throw tooBigError(isLibrary);
    }

    case 'empty': {
      throw emptyError(isLibrary);
    }

    case 'notOurs':

    case 'tooNew':

    case 'invalid': {
      throw new Error(t('error.libraryFile.exportInvalid'));
    }

    default: {
      throw new Error(
        `Неизвестная причина отказа описания: ${String(result.error satisfies never)}`
      );
    }
  }
};

/**
 * Выгружает пак или всю библиотеку в файл `.amostickers`, ничего не записывая в базу: время использования паков и
 * недавние не меняются. Пределы формата проверяются до сборки архива — неполный файл не собирается. Настроек
 * (ключей, токена), недавних и режима попапа в файле нет.
 *
 * Ошибки — на языке интерфейса: выгружать нечего, файл больше предела формата, GIF больше предела с названием пака,
 * запись базы, которую не прочитает загрузка.
 *
 * @param options — пак, момент выгрузки и ход
 * @returns архив, имя файла и число стикеров
 */
export const exportLibrary = async (
  options: ExportOptions = {}
): Promise<LibraryExport> => {
  const { packId, now = new Date(), onProgress } = options;
  const isLibrary = packId === undefined;
  const packs = await loadPacks(packId);
  const total = checkLimits(packs, isLibrary);
  const { manifest, entries } = buildManifest(packs, isLibrary);
  const text = JSON.stringify(manifest);

  checkManifest(text, isLibrary);
  onProgress?.({ done: 0, total });
  const manifestEntry = {
    name: MANIFEST_FILE,
    data: new Blob([text], { type: 'application/json' }),
  };
  let blob: Blob;

  try {
    blob = await writeZip([manifestEntry, ...entries], {
      modified: now,
      onEntry: (written) => {
        /**
         * Первая запись — описание, стикеры идут за ним.
         */
        if (written > 1) onProgress?.({ done: written - 1, total });
      },
    });
  } catch (error) {
    if (error instanceof ZipError && error.kind === 'tooLarge') {
      throw tooBigError(isLibrary);
    }

    throw error;
  }

  const firstPack = packs[0];
  const fileName =
    isLibrary || !firstPack ? libraryFileName(now) : packFileName(firstPack.pack);

  return { blob, fileName, stickerCount: total };
};
