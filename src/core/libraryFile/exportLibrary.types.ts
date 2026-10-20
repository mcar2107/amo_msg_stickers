import type { FavoriteRec, Pack, RecentRec, StickerRec } from '@core/db.types';
import type { ZipWriteEntry } from '@core/zip';

import type { ManifestFavorite, ManifestRecent } from './manifest.types';

/**
 * Ход выгрузки по стикерам.
 */
export type ExportProgress = {
  /**
   * Сколько стикеров упаковано в архив.
   */
  done: number;

  /**
   * Сколько стикеров выгружается всего.
   */
  total: number;
};

/**
 * Параметры выгрузки.
 */
export type ExportOptions = {
  /**
   * Пак, который выгружается. undefined — вся библиотека.
   */
  packId?: string;

  /**
   * Момент выгрузки: дата в имени файла библиотеки и время записей архива. По умолчанию — сейчас.
   */
  now?: Date;

  /**
   * Колбэк на ход выгрузки: до первого стикера и после каждого.
   */
  onProgress?: (progress: ExportProgress) => void;
};

/**
 * Готовый файл выгрузки.
 */
export type LibraryExport = {
  /**
   * Архив `.amostickers`.
   */
  blob: Blob;

  /**
   * Имя файла для скачивания.
   */
  fileName: string;

  /**
   * Стикеров в файле.
   */
  stickerCount: number;
};

/**
 * Пак выгрузки со стикерами в порядке пака.
 */
export type ExportPack = {
  /**
   * Запись пака.
   */
  pack: Pack;

  /**
   * Стикеры пака по времени добавления.
   */
  stickers: StickerRec[];
};

/**
 * Избранное и недавние библиотеки на момент выгрузки.
 */
export type ExportLists = {
  /**
   * Записи избранного от новых к старым.
   */
  favorites: FavoriteRec[];

  /**
   * Недавние обоих видов от новых к старым.
   */
  recent: RecentRec[];
};

/**
 * Разделы описания и то, что они добавляют в архив.
 */
export type ExportSections = {
  /**
   * Избранное описания от новых к старым.
   */
  favorites: ManifestFavorite[];

  /**
   * Недавние описания от новых к старым.
   */
  recent: ManifestRecent[];

  /**
   * Записи GIF снимков избранного в порядке избранного — в архиве после стикеров паков.
   */
  snapshots: ZipWriteEntry[];
};
