import { BYTES_IN_MB } from '@core/net';

/**
 * Признак формата в `manifest.json`: по нему файл amo stickers узнаётся по содержимому, а не по расширению.
 */
export const FORMAT_NAME = 'amo-stickers';

/**
 * Версия формата, которую пишет выгрузка. Чтение принимает `1…FORMAT_VERSION`; новое необязательное поле версию не
 * поднимает — неизвестные поля чтение игнорирует.
 */
export const FORMAT_VERSION = 1;

/**
 * Имя файла описания в корне архива или в его единственной папке верхнего уровня.
 */
export const MANIFEST_FILE = 'manifest.json';

/**
 * Стикеров в одном файле — и на выгрузке, и на чтении.
 */
export const MAX_FILE_STICKERS = 10_000;

/**
 * Элементов избранного в одном файле. У избранного нет лимита в библиотеке, и предел — защита чтения от описания с
 * миллионами элементов, а не урезание: больше — файл слишком большой.
 */
export const MAX_FILE_FAVORITES = 10_000;

/**
 * Id GIF у источника, символов.
 */
export const MAX_GIF_ID_LENGTH = 128;

/**
 * Ссылка на GIF или её превью, символов: длинная ссылка из файла легла бы в избранное и недавние, а оттуда — в каждый
 * запрос ленты.
 */
export const MAX_URL_LENGTH = 2048;

/**
 * Записей в архиве: стикеры, описание и запас на записи папок и `.DS_Store`, которые добавляет архиватор, когда файл
 * распаковали и сжали заново. Служебные записи `__MACOSX/` (по одной на файл с атрибутами) `readZipDirectory` в предел
 * не считает.
 */
export const MAX_ZIP_ENTRIES = 2 * MAX_FILE_STICKERS;

/**
 * Файл должен быть меньше 4 ГиБ: смещения zip32 — 32-битные, и дальше архив без zip64 не адресуется.
 */
export const MAX_FILE_BYTES = 2 ** 32;

/**
 * Распакованный GIF стикера. Стикеры в базе не больше 2 МБ, кроме последней ступени лестницы конвертации, — 8 МБ с
 * запасом, как у GIF из поиска.
 */
export const MAX_STICKER_BYTES = 8 * BYTES_IN_MB;

/**
 * Распакованный `manifest.json`: 10 000 стикеров со строками в пределах ниже укладываются примерно в 10 МБ.
 */
export const MAX_MANIFEST_BYTES = 16 * BYTES_IN_MB;

/**
 * Имя набора Telegram в id пака: у Telegram оно от 1 до 64 символов. Имя из файла идёт в id пака, ссылку на пак и
 * ключи ленты, и без предела файл мог бы занести id длиной в мегабайты.
 */
export const MAX_SET_NAME_LENGTH = 64;

/**
 * Название пака, графем.
 */
export const MAX_TITLE_GRAPHEMES = 128;

/**
 * Подпись своего стикера, графем.
 */
export const MAX_CAPTION_GRAPHEMES = 200;

/**
 * Эмодзи стикера, графем.
 */
export const MAX_EMOJI_GRAPHEMES = 16;

/**
 * Режем по графемам, а не по UTF-16 единицам или кодпоинтам: первое разрывает суррогатную пару, второе — ZWJ-эмодзи
 * и флаги.
 */
const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Урезает строку до предела формата. Длинная строка из файла урезается, а не отклоняет файл, — так и выгрузка, и
 * чтение получают одну и ту же строку.
 *
 * @param text — название, подпись или эмодзи
 * @param maxGraphemes — предел в графемах
 * @returns первые `maxGraphemes` графем строки
 */
export const clampGraphemes = (text: string, maxGraphemes: number) => {
  let result = '';
  let count = 0;

  for (const { segment } of GRAPHEME_SEGMENTER.segment(text)) {
    if (count === maxGraphemes) break;
    result += segment;
    count += 1;
  }

  return result;
};
