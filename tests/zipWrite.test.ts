import { describe, expect, it } from 'vitest';

import { crc32, crc32Stream } from '../src/core/zip/crc32';
import { ZipError } from '../src/core/zip/zipError';
import { findZipRoot, readZipDirectory, readZipEntry } from '../src/core/zip/zipRead';
import { writeZip } from '../src/core/zip/zipWrite';

const encoder = new TextEncoder();

/**
 * 2026-10-15 14:45:36 местного времени: DOS-время 14:45:36 → 0x75B2, дата → 0x5D4F.
 */
const MODIFIED = new Date(2026, 9, 15, 14, 45, 36);
const DOS_TIME = 0x75_b2;
const DOS_DATE = 0x5d_4f;

const MANIFEST = '{"format":"amo-stickers"}';
const GIF = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0xff, 0x3b]);
const CYRILLIC_NAME = 'папка/ё.txt';

/**
 * @param blob — архив
 * @returns его байты и `DataView` над ними
 */
const bytesOf = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());

  return { bytes, view: new DataView(bytes.buffer) };
};

describe('crc32', () => {
  it.each([
    ['', 0],
    ['123456789', 0xcb_f4_39_26],
    ['The quick brown fox jumps over the lazy dog', 0x41_4f_a3_39],
  ])('CRC-32 «%s»', (text, expected) => {
    expect(crc32(encoder.encode(text))).toBe(expected);
  });

  it('по частям потока — то же, что целиком', async () => {
    const stream = new Blob(['1234', '56789']).stream();

    await expect(crc32Stream(stream)).resolves.toEqual({ crc: 0xcb_f4_39_26, size: 9 });
  });
});

describe('writeZip', () => {
  const build = () => {
    return writeZip(
      [
        { name: 'manifest.json', data: new Blob([MANIFEST]) },
        { name: 'stickers/0.gif', data: new Blob([GIF]) },
        { name: CYRILLIC_NAME, data: new Blob(['ё']) },
      ],
      { modified: MODIFIED }
    );
  };

  it('пишет локальные заголовки, каталог и EOCD с рукописными значениями', async () => {
    const archive = await build();
    const { bytes, view } = await bytesOf(archive);
    const nameLength = encoder.encode(CYRILLIC_NAME).byteLength;
    const local1 = 30 + 13 + MANIFEST.length;
    const local2 = local1 + 30 + 14 + GIF.length;
    const centralStart = local2 + 30 + nameLength + 2;
    const centralSize = 3 * 46 + 13 + 14 + nameLength;

    expect(archive.type).toBe('application/zip');
    expect(archive.size).toBe(centralStart + centralSize + 22);

    expect(view.getUint32(0, true)).toBe(0x04_03_4b_50);
    expect(view.getUint16(4, true)).toBe(10);
    expect(view.getUint16(6, true)).toBe(0x8_00);
    expect(view.getUint16(8, true)).toBe(0);
    expect(view.getUint16(10, true)).toBe(DOS_TIME);
    expect(view.getUint16(12, true)).toBe(DOS_DATE);
    expect(view.getUint32(14, true)).toBe(crc32(encoder.encode(MANIFEST)));
    expect(view.getUint32(18, true)).toBe(MANIFEST.length);
    expect(view.getUint32(22, true)).toBe(MANIFEST.length);
    expect(view.getUint16(26, true)).toBe(13);
    expect(view.getUint16(28, true)).toBe(0);
    expect(new TextDecoder().decode(bytes.subarray(30, 43))).toBe('manifest.json');
    expect(new TextDecoder().decode(bytes.subarray(43, local1))).toBe(MANIFEST);

    expect(view.getUint32(local1, true)).toBe(0x04_03_4b_50);
    expect(view.getUint32(local1 + 14, true)).toBe(crc32(GIF));
    expect(bytes.subarray(local1 + 30 + 14, local2)).toEqual(GIF);

    const eocd = centralStart + centralSize;

    expect(view.getUint32(eocd, true)).toBe(0x06_05_4b_50);
    expect(view.getUint16(eocd + 4, true)).toBe(0);
    expect(view.getUint16(eocd + 6, true)).toBe(0);
    expect(view.getUint16(eocd + 8, true)).toBe(3);
    expect(view.getUint16(eocd + 10, true)).toBe(3);
    expect(view.getUint32(eocd + 12, true)).toBe(centralSize);
    expect(view.getUint32(eocd + 16, true)).toBe(centralStart);
    expect(view.getUint16(eocd + 20, true)).toBe(0);
  });

  it('заголовки по смещениям из каталога совпадают с каталогом', async () => {
    const { bytes, view } = await bytesOf(await build());
    const eocd = bytes.byteLength - 22;
    let cursor = view.getUint32(eocd + 16, true);
    const names: string[] = [];

    for (let index = 0; index < 3; index++) {
      const nameLength = view.getUint16(cursor + 28, true);
      const local = view.getUint32(cursor + 42, true);

      expect(view.getUint32(cursor, true)).toBe(0x02_01_4b_50);
      expect(view.getUint16(cursor + 4, true)).toBe(20);
      expect(view.getUint16(cursor + 30, true)).toBe(0);
      expect(view.getUint16(cursor + 32, true)).toBe(0);
      expect(view.getUint32(cursor + 38, true)).toBe(0);
      expect(view.getUint32(local, true)).toBe(0x04_03_4b_50);

      for (const [localField, centralField, width] of [
        [6, 8, 2],
        [8, 10, 2],
        [10, 12, 2],
        [12, 14, 2],
        [14, 16, 4],
        [18, 20, 4],
        [22, 24, 4],
        [26, 28, 2],
      ] as const) {
        const read = (offset: number) => {
          return width === 4
            ? view.getUint32(offset, true)
            : view.getUint16(offset, true);
        };

        expect(read(local + localField)).toBe(read(cursor + centralField));
      }

      expect(bytes.subarray(local + 30, local + 30 + nameLength)).toEqual(
        bytes.subarray(cursor + 46, cursor + 46 + nameLength)
      );
      names.push(
        new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))
      );
      cursor += 46 + nameLength;
    }

    expect(names).toEqual(['manifest.json', 'stickers/0.gif', CYRILLIC_NAME]);
  });

  it('читается своим чтением', async () => {
    const archive = await build();
    const directory = await readZipDirectory(archive, { maxEntries: 10 });
    const gif = directory.entries.get('stickers/0.gif');
    const text = directory.entries.get(CYRILLIC_NAME);

    expect([...directory.entries.keys()]).toEqual([
      'manifest.json',
      'stickers/0.gif',
      CYRILLIC_NAME,
    ]);
    expect(findZipRoot(directory, 'manifest.json')).toBe('');
    expect(gif && text).toBeTruthy();

    if (!gif || !text) return;

    const gifBlob = await readZipEntry(archive, gif, {
      maxBytes: 100,
      type: 'image/gif',
    });

    expect(gifBlob.type).toBe('image/gif');
    expect(new Uint8Array(await gifBlob.arrayBuffer())).toEqual(GIF);
    await expect(
      (await readZipEntry(archive, text, { maxBytes: 100 })).text()
    ).resolves.toBe('ё');
  });

  it('пустой список — архив из одного EOCD', async () => {
    const { bytes, view } = await bytesOf(await writeZip([]));

    expect(bytes.byteLength).toBe(22);
    expect(view.getUint32(0, true)).toBe(0x06_05_4b_50);
  });

  it('записей больше, чем вмещает zip32, — tooLarge до чтения данных', async () => {
    const data = new Blob();
    const entries = Array.from({ length: 0xff_ff }, (_, index) => {
      return { name: String(index), data };
    });

    await expect(writeZip(entries)).rejects.toMatchObject({
      name: 'ZipError',
      kind: 'tooLarge',
    });
    await expect(writeZip(entries)).rejects.toBeInstanceOf(ZipError);
  });

  it('архив не меньше 4 ГиБ — tooLarge до чтения данных', async () => {
    /**
     * `Blob` с размером 4 ГиБ без 4 ГиБ памяти: упаковка обязана отказать по размеру, не читая
     * данные.
     */
    class HugeBlob extends Blob {
      override get size() {
        return 2 ** 32;
      }

      override stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
        throw new Error('данные не должны читаться');
      }
    }

    await expect(
      writeZip([{ name: 'big.gif', data: new HugeBlob() }])
    ).rejects.toMatchObject({ name: 'ZipError', kind: 'tooLarge' });
  });

  it('имя длиннее 65 535 байт — tooLarge', async () => {
    const name = 'ё'.repeat(0x80_00);

    await expect(writeZip([{ name, data: new Blob() }])).rejects.toMatchObject({
      name: 'ZipError',
      kind: 'tooLarge',
    });
    await expect(
      writeZip([{ name: 'a'.repeat(0xff_ff), data: new Blob() }])
    ).resolves.toBeInstanceOf(Blob);
  });
});
