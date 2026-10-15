import { CUSTOM_PACK_ID, listPacks, listStickerIds } from '../db';
import { t } from '../i18n/translate';
import type { ZipEntry } from '../zip/zip.types';
import { ZipError } from '../zip/zipError';
import { LOCAL_HEADER_SIGNATURE } from '../zip/zipFormat';
import { findZipRoot, readZipDirectory, readZipEntry } from '../zip/zipRead';

import {
  MANIFEST_FILE,
  MAX_FILE_BYTES,
  MAX_FILE_STICKERS,
  MAX_MANIFEST_BYTES,
  MAX_STICKER_BYTES,
  MAX_ZIP_ENTRIES,
} from './limits';
import type { LibraryManifest, ManifestError } from './manifest.types';
import { parseManifest } from './manifest.types';
import type {
  FileCard,
  FileCardPack,
  LibraryFile,
  LibraryState,
} from './readLibraryFile.types';

/**
 * Ошибка файла на языке интерфейса. Создаётся на каждый отказ: текст берётся в момент броска.
 *
 * @param reason — причина отказа
 * @param cause — исходная ошибка для консоли
 * @returns ошибка с текстом для пользователя
 */
const fileError = (reason: ManifestError | 'broken' | 'readFailed', cause?: unknown) => {
  const options = cause === undefined ? undefined : { cause };

  switch (reason) {
    case 'notOurs': {
      return new Error(t('error.libraryFile.notOurs'), options);
    }

    case 'broken': {
      return new Error(t('error.libraryFile.broken'), options);
    }

    case 'invalid': {
      return new Error(t('error.libraryFile.invalid'), options);
    }

    case 'tooNew': {
      return new Error(t('error.libraryFile.tooNew'), options);
    }

    case 'tooBig': {
      return new Error(
        t('error.libraryFile.tooBig', { max: MAX_FILE_STICKERS }),
        options
      );
    }

    case 'empty': {
      return new Error(t('error.libraryFile.empty'), options);
    }

    case 'readFailed': {
      return new Error(t('error.libraryFile.readFailed'), options);
    }

    default: {
      throw new Error(
        `Неизвестная причина отказа файла: ${String(reason satisfies never)}`
      );
    }
  }
};

/**
 * Переводит сбой чтения архива в ошибку файла. Сбой, который не `ZipError`, — браузер не дочитал файл (его изменили
 * или удалили на диске после выбора), и помочь может только выбор заново.
 *
 * @param error — сбой чтения архива
 * @returns ошибка с текстом для пользователя
 */
export const toFileError = (error: unknown) => {
  if (!(error instanceof ZipError)) return fileError('readFailed', error);

  switch (error.kind) {
    case 'broken': {
      return fileError('broken', error);
    }

    case 'tooLarge': {
      return fileError('tooBig', error);
    }

    default: {
      throw new Error(
        `Неизвестный вид ошибки архива: ${String(error.kind satisfies never)}`
      );
    }
  }
};

/**
 * Обрезанный файл выгрузки начинается с локального заголовка zip, а картинка или документ — нет: так «скачан не до
 * конца» отличается от «не тот файл», хотя конца каталога zip нет у обоих.
 *
 * @param file — файл
 * @returns true — первые байты — сигнатура записи zip
 */
const startsAsZip = async (file: Blob) => {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());

  return (
    head.length === 4 &&
    new DataView(head.buffer).getUint32(0, true) === LOCAL_HEADER_SIGNATURE
  );
};

/**
 * Каталог архива. Не zip вовсе — «Это не файл amo stickers», zip без конца каталога — битый файл.
 *
 * @param file — файл
 * @returns каталог архива
 */
const readDirectory = async (file: Blob) => {
  try {
    return await readZipDirectory(file, { maxEntries: MAX_ZIP_ENTRIES });
  } catch (error) {
    if (!(error instanceof ZipError) || error.kind !== 'broken') throw toFileError(error);
    let isZip: boolean;

    try {
      isZip = await startsAsZip(file);
    } catch (readError) {
      throw toFileError(readError);
    }

    throw fileError(isZip ? 'broken' : 'notOurs', error);
  }
};

/**
 * Текст описания: CRC и размер записи сверены с каталогом.
 *
 * @param file — файл
 * @param entry — запись `manifest.json`
 * @returns текст описания
 */
const readManifestText = async (file: Blob, entry: ZipEntry) => {
  if (entry.uncompressedSize > MAX_MANIFEST_BYTES) throw fileError('invalid');

  try {
    const blob = await readZipEntry(file, entry, { maxBytes: MAX_MANIFEST_BYTES });

    return await blob.text();
  } catch (error) {
    throw toFileError(error);
  }
};

/**
 * Не JSON — чужой файл с тем же именем (например, архив расширения браузера), а не битый наш: порчу нашего описания
 * ловит сверка CRC до разбора.
 *
 * @param text — текст `manifest.json`
 * @returns описание в пределах формата
 */
const parseManifestText = (text: string): LibraryManifest => {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch (error) {
    throw fileError('notOurs', error);
  }

  const result = parseManifest(json);

  if ('error' in result) throw fileError(result.error);

  return result.manifest;
};

/**
 * Читает описание файла выгрузки, не читая GIF и не трогая базу: zip, `manifest.json`, его гарды и то, что каждый
 * стикер ссылается на запись архива не больше предела GIF. Узнаёт файл по содержимому, а не по расширению и типу.
 *
 * Ошибки — на языке интерфейса: «Это не файл amo stickers», битый файл, файл новее, слишком большой файл, ошибки в
 * описании, пустой файл и «не удалось прочитать» — файл изменили на диске после выбора.
 *
 * @param file — выбранный файл
 * @returns описание и записи архива стикеров
 */
export const readLibraryFile = async (file: Blob): Promise<LibraryFile> => {
  /**
   * До чтения каталога: смещения zip32 за 4 ГиБ не адресуются, и такой файл каталог объявил бы битым.
   */
  if (file.size >= MAX_FILE_BYTES) throw fileError('tooBig');
  const directory = await readDirectory(file);
  const root = findZipRoot(directory, MANIFEST_FILE);
  const manifestEntry =
    root === null ? undefined : directory.entries.get(`${root}${MANIFEST_FILE}`);

  if (root === null || !manifestEntry) throw fileError('notOurs');
  const manifest = parseManifestText(await readManifestText(file, manifestEntry));
  const entries = new Map<string, ZipEntry>();

  for (const { stickers } of manifest.packs) {
    for (const { id, file: path } of stickers) {
      const entry = directory.entries.get(`${root}${path}`);

      if (!entry || entry.uncompressedSize > MAX_STICKER_BYTES) throw fileError('broken');
      entries.set(id, entry);
    }
  }

  return { file, manifest, entries };
};

/**
 * Сверяет описание с библиотекой без чтения GIF: дёшево, поэтому повторяется при возврате на сегмент и по «Импорт».
 *
 * @param manifest — описание файла
 * @param library — состояние библиотеки
 * @returns карточка «что добавится»
 */
export const compareWithLibrary = (
  manifest: LibraryManifest,
  library: LibraryState
): FileCard => {
  const { packIds, stickerIds } = library;
  let stickerCount = 0;
  let newStickerCount = 0;
  let newPackCount = 0;

  const packs = manifest.packs.map<FileCardPack>((pack) => {
    const isInLibrary = packIds.has(pack.id);
    const newStickers = pack.stickers.filter(({ id }) => {
      return !stickerIds.has(id);
    });
    const isNew = !isInLibrary && pack.id !== CUSTOM_PACK_ID && newStickers.length > 0;

    stickerCount += pack.stickers.length;
    newStickerCount += newStickers.length;
    if (isNew) newPackCount += 1;

    return { pack, isInLibrary, isNew, newStickers };
  });

  return { packs, stickerCount, newStickerCount, newPackCount };
};

/**
 * Карточка по текущему состоянию библиотеки.
 *
 * @param libraryFile — прочитанный файл
 * @returns карточка «что добавится»
 */
export const loadFileCard = async (libraryFile: LibraryFile): Promise<FileCard> => {
  const [packs, stickerIds] = await Promise.all([listPacks(), listStickerIds()]);

  return compareWithLibrary(libraryFile.manifest, {
    packIds: new Set(
      packs.map(({ id }) => {
        return id;
      })
    ),
    stickerIds: new Set(stickerIds),
  });
};
