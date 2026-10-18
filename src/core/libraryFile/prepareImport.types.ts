import type { ManifestSource } from './manifest.types';

/**
 * Проверенный стикер плана импорта.
 */
export type ImportPlanSticker = {
  /**
   * Id стикера в библиотеке.
   */
  id: string;

  /**
   * GIF стикера с типом `image/gif`: прошёл сверку CRC архива и проверку GIF.
   */
  blob: Blob;

  /**
   * Ширина из заголовка GIF, а не из описания.
   */
  width: number;

  /**
   * Высота из заголовка GIF, а не из описания.
   */
  height: number;

  /**
   * Эмодзи стикера. undefined — эмодзи нет.
   */
  emoji?: string;

  /**
   * Подпись своего стикера. undefined — подписи нет.
   */
  caption?: string;
};

/**
 * Пак плана импорта: поля пака из файла и его новые стикеры.
 */
export type ImportPlanPack = {
  /**
   * Id пака: `custom` или `tg:<имя набора>`.
   */
  id: string;

  /**
   * Откуда пак.
   */
  source: ManifestSource;

  /**
   * Название пака из файла.
   */
  title: string;

  /**
   * Имя набора Telegram. undefined — его нет в файле.
   */
  sourceRef?: string;

  /**
   * Время добавления пака из файла. undefined — его нет, пак получит время импорта.
   */
  createdAt?: number;

  /**
   * Время использования пака из файла. undefined — его нет.
   */
  usedAt?: number;

  /**
   * Обложка из файла — стикер этого пака в файле, но не обязательно из новых. undefined — её нет.
   */
  coverId?: string;

  /**
   * Новые стикеры пака в порядке файла; хотя бы один.
   */
  stickers: ImportPlanSticker[];
};

/**
 * План импорта: паки в порядке файла, только те, в которые добавляется хоть один стикер.
 */
export type ImportPlan = {
  /**
   * Паки плана.
   */
  packs: ImportPlanPack[];
};

/**
 * Ход проверки стикеров.
 */
export type FileImportProgress = {
  /**
   * Сколько стикеров проверено.
   */
  done: number;

  /**
   * Сколько стикеров проверяется всего.
   */
  total: number;
};

/**
 * Параметры подготовки импорта.
 */
export type PrepareImportOptions = {
  /**
   * Отмена: проверяется перед каждым стикером. undefined — без отмены.
   */
  signal?: AbortSignal;

  /**
   * Колбэк на ход проверки: до первого стикера и после каждого.
   */
  onProgress?: (progress: FileImportProgress) => void;
};
