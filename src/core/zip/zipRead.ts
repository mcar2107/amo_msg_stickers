import { crc32, CRC32_START, crc32Finish, crc32Update } from './crc32';
import type {
  ZipDirectory,
  ZipDirectoryLimits,
  ZipEntry,
  ZipEntryContent,
  ZipEntryData,
  ZipEntryReadOptions,
} from './zip.types';
import { ZipError } from './zipError';
import {
  CENTRAL_HEADER_SIGNATURE,
  CENTRAL_HEADER_SIZE,
  EOCD_SIGNATURE,
  EOCD_SIZE,
  FLAG_ENCRYPTED,
  LOCAL_HEADER_SIGNATURE,
  LOCAL_HEADER_SIZE,
  MAX_COMMENT,
  METHOD_DEFLATE,
  METHOD_STORED,
  ZIP64_LOCATOR_SIGNATURE,
  ZIP64_LOCATOR_SIZE,
  ZIP64_U16,
  ZIP64_U32,
} from './zipFormat';

/**
 * Служебная папка, которую архиватор macOS кладёт рядом с содержимым (ресурсные вилки и
 * атрибуты): при поиске единственной папки верхнего уровня и в пределе записей она не считается.
 */
const MAC_SERVICE_DIR = '__MACOSX';

/**
 * @param name — имя записи
 * @returns запись лежит в служебной папке архиватора macOS
 */
const isMacService = (name: string) => {
  return name === MAC_SERVICE_DIR || name.startsWith(`${MAC_SERVICE_DIR}/`);
};

const utf8 = new TextDecoder('utf-8', { fatal: true });
const latin1 = new TextDecoder('latin1');

/**
 * @param message — что не так
 * @param cause — исходная ошибка
 * @returns ошибка битого архива
 */
const broken = (message: string, cause?: unknown) => {
  return new ZipError('broken', message, cause === undefined ? undefined : { cause });
};

/**
 * Читает байты среза файла. Срез за концом файла `Blob` молча укорачивает — здесь это ошибка.
 *
 * @param blob — архив
 * @param start — смещение
 * @param length — сколько байтов нужно
 * @returns ровно `length` байтов
 */
const readBytes = async (blob: Blob, start: number, length: number) => {
  if (start < 0 || start + length > blob.size) {
    throw broken(`Срез ${start}+${length} за концом файла ${blob.size}`);
  }

  const bytes = new Uint8Array(await blob.slice(start, start + length).arrayBuffer());

  if (bytes.byteLength !== length)
    throw broken(`Прочитано ${bytes.byteLength} из ${length}`);

  return bytes;
};

/**
 * Имя записи. Архиваторы macOS (`zip`, `ditto`) пишут UTF-8 без флага бита 11, поэтому UTF-8
 * пробуется всегда, а не только по флагу; не UTF-8 — однозначная побайтовая латиница: так имена
 * CP437 с одинаковыми байтами совпадают между собой, а наши ASCII-имена читаются как есть.
 *
 * @param bytes — байты имени
 * @returns имя записи
 */
const decodeName = (bytes: Uint8Array) => {
  try {
    return utf8.decode(bytes);
  } catch {
    return latin1.decode(bytes);
  }
};

/**
 * Имя, распаковка которого вышла бы за папку архива. На такую запись нельзя сослаться: её нет в
 * каталоге.
 *
 * @param name — имя записи
 * @returns `true` — имя опасное
 */
const isUnsafeName = (name: string) => {
  return (
    name === '' ||
    name.startsWith('/') ||
    name.includes('\\') ||
    name.includes('\0') ||
    /^[A-Za-z]:/.test(name) ||
    name.split('/').includes('..')
  );
};

/**
 * Ищет конец центрального каталога с конца файла. Сигнатура может встретиться внутри
 * комментария или данных, поэтому кандидат принимается, только если длина комментария из него
 * доводит ровно до конца файла.
 *
 * @param blob — архив
 * @returns смещение EOCD и его байты
 */
const findEocd = async (blob: Blob) => {
  const tailLength = Math.min(blob.size, EOCD_SIZE + MAX_COMMENT);
  const tailStart = blob.size - tailLength;
  const tail = await readBytes(blob, tailStart, tailLength);
  const view = new DataView(tail.buffer);

  for (let index = tailLength - EOCD_SIZE; index >= 0; index--) {
    if (
      view.getUint32(index, true) === EOCD_SIGNATURE &&
      index + EOCD_SIZE + view.getUint16(index + 20, true) === tailLength
    ) {
      return {
        position: tailStart + index,
        eocd: new DataView(tail.buffer, index, EOCD_SIZE),
      };
    }
  }

  throw broken('Конец центрального каталога не найден');
};

/**
 * Записи-соседи определяют, где кончается область записи: заголовок и данные должны уместиться до
 * начала следующей по смещению записи или центрального каталога.
 *
 * @param offsets — смещения локальных заголовков всех записей каталога
 * @param centralOffset — начало центрального каталога
 * @returns граница области для каждого смещения
 */
const regionEnds = (offsets: number[], centralOffset: number) => {
  const sorted = [...offsets].sort((left, right) => {
    return left - right;
  });
  const ends = new Map<number, number>();

  for (const [index, offset] of sorted.entries()) {
    const previous = sorted[index - 1];
    const next = sorted[index + 1];

    if (previous === offset || next === offset || offset >= centralOffset) {
      ends.set(offset, offset);
    } else {
      ends.set(
        offset,
        Math.min(next === undefined ? centralOffset : next, centralOffset)
      );
    }
  }

  return ends;
};

/**
 * Читает центральный каталог архива. Ни одно смещение не читается без проверки против размера
 * файла.
 *
 * Ошибка `broken` — не zip, обрезанный файл, zip64, многодисковый архив, данные, дописанные перед
 * архивом (смещение каталога не сходится с положением его конца), повтор имени. Ошибка
 * `tooLarge` — записей больше `maxEntries`, не считая служебных `__MACOSX/`: архиватор macOS кладёт
 * их по одной на каждый файл с атрибутами, и пересжатый в Finder файл иначе упёрся бы в предел вдвое
 * раньше. Записи с опасными именами пропускаются.
 *
 * @param blob — архив
 * @param limits — пределы каталога
 * @returns записи по имени
 */
export const readZipDirectory = async (
  blob: Blob,
  limits: ZipDirectoryLimits
): Promise<ZipDirectory> => {
  const { position, eocd } = await findEocd(blob);
  const disk = eocd.getUint16(4, true);
  const centralDisk = eocd.getUint16(6, true);
  const diskEntries = eocd.getUint16(8, true);
  const totalEntries = eocd.getUint16(10, true);
  const centralSize = eocd.getUint32(12, true);
  const centralOffset = eocd.getUint32(16, true);

  if (
    [disk, centralDisk, diskEntries, totalEntries].includes(ZIP64_U16) ||
    [centralSize, centralOffset].includes(ZIP64_U32)
  ) {
    throw broken('Архив zip64');
  }

  if (position >= ZIP64_LOCATOR_SIZE) {
    const locator = await readBytes(blob, position - ZIP64_LOCATOR_SIZE, 4);

    if (new DataView(locator.buffer).getUint32(0, true) === ZIP64_LOCATOR_SIGNATURE) {
      throw broken('Архив zip64');
    }
  }

  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) {
    throw broken('Многодисковый архив');
  }

  if (centralOffset + centralSize !== position) {
    throw broken('Центральный каталог не сходится с концом каталога');
  }

  const central = await readBytes(blob, centralOffset, centralSize);
  const view = new DataView(central.buffer);
  const parsed: Omit<ZipEntry, 'regionEnd'>[] = [];
  const unsafeOffsets: number[] = [];
  let counted = 0;
  let cursor = 0;

  for (let index = 0; index < totalEntries; index++) {
    if (
      cursor + CENTRAL_HEADER_SIZE > centralSize ||
      view.getUint32(cursor, true) !== CENTRAL_HEADER_SIGNATURE
    ) {
      throw broken(`Запись ${index} центрального каталога повреждена`);
    }

    const nameLength = view.getUint16(cursor + 28, true);
    const headerEnd =
      cursor +
      CENTRAL_HEADER_SIZE +
      nameLength +
      view.getUint16(cursor + 30, true) +
      view.getUint16(cursor + 32, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const startDisk = view.getUint16(cursor + 34, true);
    const localOffset = view.getUint32(cursor + 42, true);

    if (headerEnd > centralSize) throw broken(`Запись ${index} за концом каталога`);

    if (
      [compressedSize, uncompressedSize, localOffset].includes(ZIP64_U32) ||
      startDisk === ZIP64_U16
    ) {
      throw broken('Запись zip64');
    }

    if (startDisk !== 0) throw broken('Многодисковый архив');

    const name = decodeName(
      central.subarray(
        cursor + CENTRAL_HEADER_SIZE,
        cursor + CENTRAL_HEADER_SIZE + nameLength
      )
    );

    if (!isMacService(name)) counted += 1;

    if (isUnsafeName(name)) {
      unsafeOffsets.push(localOffset);
    } else {
      parsed.push({
        name,
        flags: view.getUint16(cursor + 8, true),
        method: view.getUint16(cursor + 10, true),
        crc32: view.getUint32(cursor + 16, true),
        compressedSize,
        uncompressedSize,
        localOffset,
      });
    }

    cursor = headerEnd;
  }

  if (cursor !== centralSize) throw broken('Лишние байты в центральном каталоге');

  if (counted > limits.maxEntries) {
    throw new ZipError('tooLarge', `Записей ${counted} больше ${limits.maxEntries}`);
  }

  const ends = regionEnds(
    [
      ...parsed.map(({ localOffset }) => {
        return localOffset;
      }),
      ...unsafeOffsets,
    ],
    centralOffset
  );
  const entries = new Map<string, ZipEntry>();

  for (const entry of parsed) {
    if (entries.has(entry.name)) throw broken(`Повтор имени ${entry.name}`);
    entries.set(entry.name, {
      ...entry,
      regionEnd: ends.get(entry.localOffset) || entry.localOffset,
    });
  }

  return { entries };
};

/**
 * Каталог, от которого разрешаются пути описания: корень архива, если `fileName` лежит в нём,
 * иначе единственная папка верхнего уровня (без служебной `__MACOSX/`), если `fileName` лежит в
 * ней. Так читается и архив, распакованный и запакованный архиватором заново: он кладёт
 * содержимое в папку с именем архива.
 *
 * @param directory — каталог архива
 * @param fileName — имя файла описания
 * @returns префикс путей (`''` или `<папка>/`); `null` — описания нет
 */
export const findZipRoot = (directory: ZipDirectory, fileName: string) => {
  const { entries } = directory;

  if (entries.has(fileName)) return '';

  const folders = new Set<string>();

  for (const name of entries.keys()) {
    const slash = name.indexOf('/');

    if (slash > 0 && name.slice(0, slash) !== MAC_SERVICE_DIR) {
      folders.add(name.slice(0, slash + 1));
    }
  }

  const [folder] = folders;

  if (folders.size !== 1 || folder === undefined) return null;

  return entries.has(`${folder}${fileName}`) ? folder : null;
};

/**
 * Распаковывает deflate с обрывом, как только выход превысил размер из каталога: размер
 * проверен против `maxBytes` заранее, поэтому zip-бомба не разворачивается дальше предела.
 *
 * @param data — сжатые данные записи
 * @param entry — запись каталога
 * @param type — MIME-тип результата
 * @returns распакованные данные и их CRC-32
 */
const inflate = async (
  data: Blob,
  entry: ZipEntry,
  type: string
): Promise<ZipEntryData> => {
  const reader = data
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
    .getReader();
  /**
   * Выход не длиннее размера из каталога — это проверяется на каждом куске, поэтому буфер выделяется сразу.
   */
  const bytes = new Uint8Array(entry.uncompressedSize);
  let state = CRC32_START;
  let size = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) break;

      if (size + value.byteLength > entry.uncompressedSize) {
        await reader.cancel();
        throw broken(`${entry.name}: распаковано больше ${entry.uncompressedSize}`);
      }

      state = crc32Update(state, value);
      bytes.set(value, size);
      size += value.byteLength;
    }
  } catch (error) {
    if (error instanceof ZipError) throw error;
    throw broken(`${entry.name}: поток deflate повреждён`, error);
  }

  return { blob: new Blob([bytes], { type }), bytes, crc: crc32Finish(state), size };
};

/**
 * Читает данные записи и сверяет их CRC-32 с центральным каталогом. Смещение данных считается
 * по длинам имени и extra локального заголовка — у архиваторов они расходятся с каталогом, —
 * а размеры и CRC берутся из каталога: при data descriptor локальный заголовок несёт нули.
 *
 * Ошибка `broken` — заголовок или данные за границей своей области (за концом файла, на месте
 * другой записи или каталога), зашифрованная запись, метод кроме 0 и 8, у метода 0 сжатый
 * размер не равен несжатому, распакованный размер больше `maxBytes` или не равен каталогу,
 * повреждённый deflate, расхождение CRC.
 *
 * @param blob — архив
 * @param entry — запись из `readZipDirectory` этого архива
 * Каждый срез архива читается один раз: CRC считается по прочитанным байтам, и они же отдаются вызывающему.
 *
 * @param options — предел размера и MIME-тип результата
 * @returns данные записи `Blob`-ом (у метода 0 — срез архива без копии) и байтами
 */
export const readZipEntry = async (
  blob: Blob,
  entry: ZipEntry,
  options: ZipEntryReadOptions
): Promise<ZipEntryContent> => {
  const { maxBytes, type = '' } = options;
  const { name, localOffset, regionEnd, compressedSize, uncompressedSize } = entry;

  if (entry.flags & FLAG_ENCRYPTED) throw broken(`${name}: запись зашифрована`);

  if (uncompressedSize > maxBytes) {
    throw broken(`${name}: ${uncompressedSize} байт больше предела ${maxBytes}`);
  }

  if (localOffset + LOCAL_HEADER_SIZE > regionEnd) {
    throw broken(`${name}: заголовок за границей записи`);
  }

  const local = new DataView(
    (await readBytes(blob, localOffset, LOCAL_HEADER_SIZE)).buffer
  );

  if (local.getUint32(0, true) !== LOCAL_HEADER_SIGNATURE) {
    throw broken(`${name}: нет локального заголовка`);
  }

  const dataStart =
    localOffset +
    LOCAL_HEADER_SIZE +
    local.getUint16(26, true) +
    local.getUint16(28, true);
  const dataEnd = dataStart + compressedSize;

  if (dataEnd > regionEnd || dataEnd > blob.size) {
    throw broken(`${name}: данные за границей записи`);
  }

  const data = blob.slice(dataStart, dataEnd, type);
  let result: ZipEntryData;

  switch (entry.method) {
    case METHOD_STORED: {
      if (compressedSize !== uncompressedSize) {
        throw broken(`${name}: у записи без сжатия размеры различаются`);
      }

      const bytes = new Uint8Array(await data.arrayBuffer());

      result = { blob: data, bytes, crc: crc32(bytes), size: bytes.byteLength };
      break;
    }

    case METHOD_DEFLATE: {
      result = await inflate(data, entry, type);
      break;
    }

    default: {
      throw broken(`${name}: метод сжатия ${entry.method}`);
    }
  }

  if (result.size !== uncompressedSize) {
    throw broken(`${name}: размер ${result.size} вместо ${uncompressedSize}`);
  }

  if (result.crc !== entry.crc32) throw broken(`${name}: CRC-32 не совпадает`);

  return { blob: result.blob, bytes: result.bytes };
};
