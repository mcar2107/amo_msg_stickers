/**
 * Сигнатуры и размеры структур zip (APPNOTE 4.3), общие для упаковки и чтения.
 */
export const LOCAL_HEADER_SIGNATURE = 0x04_03_4b_50;
export const CENTRAL_HEADER_SIGNATURE = 0x02_01_4b_50;
export const EOCD_SIGNATURE = 0x06_05_4b_50;
export const ZIP64_LOCATOR_SIGNATURE = 0x07_06_4b_50;

export const LOCAL_HEADER_SIZE = 30;
export const CENTRAL_HEADER_SIZE = 46;
export const EOCD_SIZE = 22;
export const ZIP64_LOCATOR_SIZE = 20;

/**
 * Наибольшая длина комментария архива: EOCD ищется в последних `EOCD_SIZE + MAX_COMMENT` байтах.
 */
export const MAX_COMMENT = 0xff_ff;

/**
 * Значения-маркеры zip64 в 16- и 32-битных полях: поле с таким значением лежит в расширении zip64.
 */
export const ZIP64_U16 = 0xff_ff;
export const ZIP64_U32 = 0xff_ff_ff_ff;

export const METHOD_STORED = 0;
export const METHOD_DEFLATE = 8;

/**
 * Бит 0 — запись зашифрована, бит 3 — размеры и CRC после данных, бит 11 — имя в UTF-8.
 */
export const FLAG_ENCRYPTED = 0x1;
export const FLAG_DATA_DESCRIPTOR = 0x8;
export const FLAG_UTF8 = 0x8_00;

/**
 * Версия 1.0 — минимальная для stored-записи; 2.0 — «создано» MS-DOS-совместимым архиватором,
 * без unix-атрибутов, которые архиватор применил бы при распаковке.
 */
export const VERSION_NEEDED_STORED = 10;
export const VERSION_MADE_BY = 20;
