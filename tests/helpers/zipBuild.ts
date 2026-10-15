import { crc32 } from '../../src/core/zip/crc32';

import type { ZipBuildEntry, ZipBuildResult } from './zipBuild.types';

const LOCAL = 30;
const CENTRAL = 46;
const EOCD = 22;
const DESCRIPTOR = 16;
const FLAG_DESCRIPTOR = 0x8;
const FLAG_UTF8 = 0x8_00;

/**
 * @param data — несжатые данные
 * @returns они же в raw deflate
 */
const deflateRaw = async (data: Uint8Array<ArrayBuffer>) => {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));

  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/**
 * Собирает zip независимо от `zipWrite.ts`: deflate, data descriptor и extra только в локальном
 * заголовке — то, что пишут архиваторы, а наша упаковка нет.
 *
 * @param entries — записи
 * @param comment — комментарий архива
 * @returns байты и раскладка архива
 */
export const buildZip = async (
  entries: ZipBuildEntry[],
  comment = new Uint8Array()
): Promise<ZipBuildResult> => {
  const encoder = new TextEncoder();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
  const localOffsets: number[] = [];
  const dataOffsets: number[] = [];
  const centralOffsets: number[] = [];
  let offset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const { data, method = 0, hasDataDescriptor = false } = entry;
    const localExtra = entry.localExtra || new Uint8Array();
    const name = encoder.encode(entry.name);
    const stored = method === 8 ? await deflateRaw(data) : data;
    const crc = crc32(data);
    const flags = FLAG_UTF8 | (hasDataDescriptor ? FLAG_DESCRIPTOR : 0);
    const local = new Uint8Array(LOCAL + name.byteLength + localExtra.byteLength);
    const localView = new DataView(local.buffer);

    localView.setUint32(0, 0x04_03_4b_50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, flags, true);
    localView.setUint16(8, method, true);

    if (!hasDataDescriptor) {
      localView.setUint32(14, crc, true);
      localView.setUint32(18, stored.byteLength, true);
      localView.setUint32(22, data.byteLength, true);
    }

    localView.setUint16(26, name.byteLength, true);
    localView.setUint16(28, localExtra.byteLength, true);
    local.set(name, LOCAL);
    local.set(localExtra, LOCAL + name.byteLength);
    localOffsets.push(offset);
    dataOffsets.push(offset + local.byteLength);
    parts.push(local, stored);
    offset += local.byteLength + stored.byteLength;

    if (hasDataDescriptor) {
      const descriptor = new Uint8Array(DESCRIPTOR);
      const descriptorView = new DataView(descriptor.buffer);

      descriptorView.setUint32(0, 0x08_07_4b_50, true);
      descriptorView.setUint32(4, crc, true);
      descriptorView.setUint32(8, stored.byteLength, true);
      descriptorView.setUint32(12, data.byteLength, true);
      parts.push(descriptor);
      offset += DESCRIPTOR;
    }

    const central = new Uint8Array(CENTRAL + name.byteLength);
    const centralView = new DataView(central.buffer);

    centralView.setUint32(0, 0x02_01_4b_50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, flags, true);
    centralView.setUint16(10, method, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, stored.byteLength, true);
    centralView.setUint32(24, data.byteLength, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(42, localOffsets.at(-1) || 0, true);
    central.set(name, CENTRAL);
    centralParts.push(central);
    centralOffsets.push(centralSize);
    centralSize += central.byteLength;
  }

  const eocd = new Uint8Array(EOCD + comment.byteLength);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06_05_4b_50, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);
  eocdView.setUint16(20, comment.byteLength, true);
  eocd.set(comment, EOCD);

  const bytes = new Uint8Array(
    await new Blob([...parts, ...centralParts, eocd]).arrayBuffer()
  );

  return {
    bytes,
    localOffsets,
    dataOffsets,
    centralOffsets: centralOffsets.map((relative) => {
      return offset + relative;
    }),
    eocdOffset: offset + centralSize,
  };
};
