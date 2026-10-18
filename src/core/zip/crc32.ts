/**
 * Таблица CRC-32 (полином 0xEDB88320, как у zip и gzip) — 256 значений на байт.
 */
const TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xed_b8_83_20 ^ (value >>> 1) : value >>> 1;
  }

  return value;
});

/**
 * Начальное состояние подсчёта для `crc32Update`.
 */
export const CRC32_START = 0xff_ff_ff_ff;

/**
 * Продолжает подсчёт CRC-32 на следующей порции байтов: данные записи читаются потоком, и
 * держать их целиком ради контрольной суммы не нужно.
 *
 * @param state — состояние после предыдущей порции или `CRC32_START`
 * @param bytes — следующая порция
 * @returns новое состояние; итог даёт `crc32Finish`
 */
export const crc32Update = (state: number, bytes: Uint8Array) => {
  let crc = state;

  for (const byte of bytes) {
    crc = (TABLE[(crc ^ byte) & 0xff] || 0) ^ (crc >>> 8);
  }

  return crc;
};

/**
 * @param state — состояние после последней порции
 * @returns CRC-32 беззнаковым числом, как в заголовках zip
 */
export const crc32Finish = (state: number) => {
  return (state ^ CRC32_START) >>> 0;
};

/**
 * @param bytes — данные целиком
 * @returns их CRC-32
 */
export const crc32 = (bytes: Uint8Array) => {
  return crc32Finish(crc32Update(CRC32_START, bytes));
};

/**
 * Считает CRC-32 потока порциями, не собирая его в память.
 *
 * @param stream — поток байтов
 * @returns CRC-32 и число прочитанных байтов
 */
export const crc32Stream = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  let state = CRC32_START;
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;
    state = crc32Update(state, value);
    size += value.byteLength;
  }

  return { crc: crc32Finish(state), size };
};
