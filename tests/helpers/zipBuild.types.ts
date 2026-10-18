/**
 * Запись архива, собираемого в тесте.
 */
export type ZipBuildEntry = {
  /**
   * Путь записи внутри архива.
   */
  name: string;

  /**
   * Несжатые данные.
   */
  data: Uint8Array<ArrayBuffer>;

  /**
   * Метод сжатия: 0 — как есть, 8 — `CompressionStream('deflate-raw')`, другой — данные как есть
   * с этим номером метода. По умолчанию 0.
   */
  method?: number;

  /**
   * Размеры и CRC — после данных (бит 3), в локальном заголовке нули, как у `ditto`.
   */
  hasDataDescriptor?: boolean;

  /**
   * Extra только в локальном заголовке: смещение данных расходится с центральным каталогом, как
   * у `zip`.
   */
  localExtra?: Uint8Array<ArrayBuffer>;
};

/**
 * Собранный архив и его раскладка — для порчи отдельных полей в тесте.
 */
export type ZipBuildResult = {
  /**
   * Байты архива.
   */
  bytes: Uint8Array<ArrayBuffer>;

  /**
   * Смещения локальных заголовков записей в порядке записей.
   */
  localOffsets: number[];

  /**
   * Смещения данных записей в порядке записей.
   */
  dataOffsets: number[];

  /**
   * Смещения записей центрального каталога в порядке записей.
   */
  centralOffsets: number[];

  /**
   * Смещение конца центрального каталога.
   */
  eocdOffset: number;
};
