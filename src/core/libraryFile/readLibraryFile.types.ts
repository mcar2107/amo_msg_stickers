import type { ZipEntry } from '@core/zip';

import type {
  LibraryManifest,
  ManifestError,
  ManifestPack,
  ManifestSticker,
} from './manifest.types';

/**
 * Причина отказа файла выгрузки: ошибка описания, битый архив или сбой чтения файла с диска.
 */
export type FileErrorReason = ManifestError | 'broken' | 'readFailed';

/**
 * Прочитанный файл выгрузки: описание проверено, у каждого стикера есть запись в архиве. GIF ещё не прочитаны.
 */
export type LibraryFile = {
  /**
   * Сам файл: GIF читаются из него срезами при подготовке импорта.
   */
  file: Blob;

  /**
   * Описание в пределах формата.
   */
  manifest: LibraryManifest;

  /**
   * Запись архива с GIF по id стикера — для каждого стикера описания.
   */
  entries: Map<string, ZipEntry>;
};

/**
 * Состояние библиотеки, с которым сверяется файл.
 */
export type LibraryState = {
  /**
   * Id паков библиотеки.
   */
  packIds: ReadonlySet<string>;

  /**
   * Id стикеров библиотеки во всех паках.
   */
  stickerIds: ReadonlySet<string>;
};

export type FileCardPack = {
  /**
   * Пак из файла.
   */
  pack: ManifestPack;

  /**
   * Пак уже есть в библиотеке: его запись не тронется, добавятся только новые стикеры.
   */
  isInLibrary: boolean;

  /**
   * Импорт создаст этот пак: его нет в библиотеке, в нём есть новые стикеры, и это не «Мои стикеры» — они есть
   * всегда и новым паком не считаются.
   */
  isNew: boolean;

  /**
   * Стикеры пака, которых нет в библиотеке, в порядке файла: стикер, id которого занят в любом паке, — не новый.
   */
  newStickers: ManifestSticker[];
};

/**
 * Карточка «что добавится»: файл, сверенный с библиотекой.
 */
export type FileCard = {
  /**
   * Паки файла в его порядке.
   */
  packs: FileCardPack[];

  /**
   * Стикеров в файле.
   */
  stickerCount: number;

  /**
   * Стикеров, которых нет в библиотеке. 0 — всё уже в библиотеке, импортировать нечего.
   */
  newStickerCount: number;

  /**
   * Паков, которые импорт создаст, без «Моих стикеров».
   */
  newPackCount: number;
};
