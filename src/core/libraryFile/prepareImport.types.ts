import type {
  ManifestGifItem,
  ManifestRecent,
  ManifestSource,
  ManifestStickerRef,
} from './manifest.types';

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
 * Избранный стикер со своим GIF, проверенным так же, как GIF стикера пака.
 */
export type ImportPlanSnapshot = ManifestStickerRef & {
  /**
   * Пак, к которому принадлежал стикер: `custom` или `tg:<имя набора>`.
   */
  packId: string;

  /**
   * Проверенный стикер снимка, id — тот же, что у элемента.
   */
  sticker: ImportPlanSticker;
};

/**
 * Элемент избранного плана: стикер паков файла, снимок со своим GIF или GIF из поиска.
 */
export type ImportPlanFavorite =
  ManifestStickerRef | ImportPlanSnapshot | ManifestGifItem;

/**
 * План импорта: паки в порядке файла, только те, в которые добавляется хоть один стикер, избранное и недавние.
 */
export type ImportPlan = {
  /**
   * Паки плана.
   */
  packs: ImportPlanPack[];

  /**
   * Избранное файла, которого не было в избранном при сверке, в порядке файла.
   */
  favorites: ImportPlanFavorite[];

  /**
   * Недавние файла целиком: запись сливает их с недавними, какими они будут в момент записи.
   */
  recent: ManifestRecent[];
};

/**
 * Ход проверки стикеров паков и GIF снимков избранного.
 */
export type FileImportProgress = {
  /**
   * Сколько стикеров и снимков проверено.
   */
  done: number;

  /**
   * Сколько стикеров и снимков проверяется всего.
   */
  total: number;
};

/**
 * Параметры подготовки импорта.
 */
export type PrepareImportOptions = {
  /**
   * Отмена: проверяется перед каждым стикером и снимком. undefined — без отмены.
   */
  signal?: AbortSignal;

  /**
   * Колбэк на ход проверки: до первого стикера и после каждого стикера и снимка.
   */
  onProgress?: (progress: FileImportProgress) => void;
};
