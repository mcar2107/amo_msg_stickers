import { crc32Stream } from './crc32';
import type { ZipWriteEntry, ZipWriteOptions } from './zip.types';
import { ZipError } from './zipError';
import {
  CENTRAL_HEADER_SIGNATURE,
  CENTRAL_HEADER_SIZE,
  EOCD_SIGNATURE,
  EOCD_SIZE,
  FLAG_UTF8,
  LOCAL_HEADER_SIGNATURE,
  LOCAL_HEADER_SIZE,
  METHOD_STORED,
  VERSION_MADE_BY,
  VERSION_NEEDED_STORED,
  ZIP64_U16,
  ZIP64_U32,
} from './zipFormat';

/**
 * Год начала отсчёта даты MS-DOS: раньше дату в заголовке не записать.
 */
const DOS_EPOCH_YEAR = 1980;

/**
 * Архив zip32 адресует смещения 32 битами, а значение `ZIP64_U32` читатели принимают за маркер
 * zip64 — поэтому весь архив строго меньше 4 ГиБ.
 */
const MAX_ARCHIVE_BYTES = ZIP64_U32;

/**
 * Длина имени в заголовках — 16-битное поле: длиннее его не записать.
 */
const MAX_NAME_BYTES = 0xff_ff;

const encoder = new TextEncoder();

/**
 * Уступает поток странице: CRC многих блобов подряд иначе заняли бы главный поток надолго.
 */
const yieldToPage = () => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

/**
 * @param date — момент времени
 * @returns время и дата в формате MS-DOS (местное время, секунды с шагом 2)
 */
const toDosDateTime = (date: Date) => {
  const year = Math.max(date.getFullYear(), DOS_EPOCH_YEAR);
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day =
    ((year - DOS_EPOCH_YEAR) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { time, day };
};

/**
 * Упаковывает записи в zip без сжатия (метод 0). GIF уже сжаты, deflate их не уменьшит, а без
 * сжатия данные записей уходят в архив ссылками на исходные `Blob`, без копии в памяти.
 *
 * CRC-32 считается по одному блобу за раз с уступкой потока после каждого.
 *
 * Ошибка `tooLarge` — записей больше, чем вмещает zip32, имя записи длиннее 65 535 байт UTF-8 или
 * архив не меньше 4 ГиБ; проверка — до чтения данных.
 *
 * @param entries — записи в порядке архива
 * @param options — время изменения записей
 * @returns архив `application/zip`
 */
export const writeZip = async (
  entries: ZipWriteEntry[],
  options: ZipWriteOptions = {}
): Promise<Blob> => {
  const { modified = new Date() } = options;
  const { time, day } = toDosDateTime(modified);

  if (entries.length >= ZIP64_U16) {
    throw new ZipError(
      'tooLarge',
      `Записей больше, чем вмещает zip32: ${entries.length}`
    );
  }

  const names = entries.map(({ name }) => {
    return encoder.encode(name);
  });
  const longName = names.find(({ byteLength }) => {
    return byteLength > MAX_NAME_BYTES;
  });

  if (longName) {
    throw new ZipError('tooLarge', `Имя записи длиннее ${MAX_NAME_BYTES} байт`);
  }

  const totalBytes = entries.reduce((sum, { data }, index) => {
    const nameBytes = names[index]?.byteLength || 0;

    return sum + LOCAL_HEADER_SIZE + CENTRAL_HEADER_SIZE + 2 * nameBytes + data.size;
  }, EOCD_SIZE);

  if (totalBytes >= MAX_ARCHIVE_BYTES) {
    throw new ZipError('tooLarge', `Архив не меньше 4 ГиБ: ${totalBytes} байт`);
  }

  const parts: BlobPart[] = [];
  const central = new Uint8Array(
    entries.reduce((sum, _entry, index) => {
      return sum + CENTRAL_HEADER_SIZE + (names[index]?.byteLength || 0);
    }, 0)
  );
  const centralView = new DataView(central.buffer);
  let offset = 0;
  let centralOffset = 0;

  for (const [index, { data }] of entries.entries()) {
    const name = names[index] || new Uint8Array();
    const { crc } = await crc32Stream(data.stream());
    const local = new Uint8Array(LOCAL_HEADER_SIZE + name.byteLength);
    const localView = new DataView(local.buffer);

    localView.setUint32(0, LOCAL_HEADER_SIGNATURE, true);
    localView.setUint16(4, VERSION_NEEDED_STORED, true);
    localView.setUint16(6, FLAG_UTF8, true);
    localView.setUint16(8, METHOD_STORED, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, day, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.size, true);
    localView.setUint32(22, data.size, true);
    localView.setUint16(26, name.byteLength, true);
    localView.setUint16(28, 0, true);
    local.set(name, LOCAL_HEADER_SIZE);

    centralView.setUint32(centralOffset, CENTRAL_HEADER_SIGNATURE, true);
    centralView.setUint16(centralOffset + 4, VERSION_MADE_BY, true);
    centralView.setUint16(centralOffset + 6, VERSION_NEEDED_STORED, true);
    centralView.setUint16(centralOffset + 8, FLAG_UTF8, true);
    centralView.setUint16(centralOffset + 10, METHOD_STORED, true);
    centralView.setUint16(centralOffset + 12, time, true);
    centralView.setUint16(centralOffset + 14, day, true);
    centralView.setUint32(centralOffset + 16, crc, true);
    centralView.setUint32(centralOffset + 20, data.size, true);
    centralView.setUint32(centralOffset + 24, data.size, true);
    centralView.setUint16(centralOffset + 28, name.byteLength, true);
    centralView.setUint32(centralOffset + 42, offset, true);
    central.set(name, centralOffset + CENTRAL_HEADER_SIZE);

    parts.push(local, data);
    offset += local.byteLength + data.size;
    centralOffset += CENTRAL_HEADER_SIZE + name.byteLength;
    await yieldToPage();
  }

  const eocd = new Uint8Array(EOCD_SIZE);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, EOCD_SIGNATURE, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, central.byteLength, true);
  eocdView.setUint32(16, offset, true);
  parts.push(central, eocd);

  return new Blob(parts, { type: 'application/zip' });
};
