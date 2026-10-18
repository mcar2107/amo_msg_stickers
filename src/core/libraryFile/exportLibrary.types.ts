import type { Pack, StickerRec } from '@core/db.types';

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
