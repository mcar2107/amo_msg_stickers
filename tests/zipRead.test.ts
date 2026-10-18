import { afterEach, describe, expect, it, vi } from 'vitest';

import { MANIFEST_FILE, MAX_FILE_STICKERS, MAX_ZIP_ENTRIES } from '@core/libraryFile';
import type { ZipDirectory } from '@core/zip';
import { crc32, findZipRoot, readZipDirectory, readZipEntry, writeZip } from '@core/zip';

import {
  buildZip,
  countingDecompression,
  DITTO_ARCHIVE,
  FIXTURE_MANIFEST,
  ZIP_R_ARCHIVE,
} from './helpers';

const encoder = new TextEncoder();
const LIMITS = { maxEntries: 100 };
const MAX_BYTES = 8 * 1024 * 1024;

const GIF_SMALL = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='),
  (char) => {
    return char.codePointAt(0) || 0;
  }
);
const GIF_LARGE = Uint8Array.from(
  [
    ...encoder.encode('GIF89a'),
    ...Array.from({ length: 512 }, (_, index) => {
      return index % 256;
    }),
    0x3b,
  ],
  (byte) => {
    return byte;
  }
);

/**
 * @param text — содержимое
 * @returns байты UTF-8
 */
const utf8 = (text: string) => {
  return encoder.encode(text);
};

/**
 * @param bytes — байты архива
 * @returns `Blob` архива
 */
const blobOf = (bytes: Uint8Array<ArrayBuffer>) => {
  return new Blob([bytes]);
};

/**
 * Пишет поле в копию архива — для порчи.
 *
 * @param bytes — архив
 * @param offset — смещение поля
 * @param value — новое значение
 * @param width — ширина поля в байтах
 * @returns изменённая копия
 */
const patch = (
  bytes: Uint8Array<ArrayBuffer>,
  offset: number,
  value: number,
  width: 2 | 4 = 4
) => {
  const copy = bytes.slice();
  const view = new DataView(copy.buffer);

  if (width === 4) {
    view.setUint32(offset, value, true);
  } else {
    view.setUint16(offset, value, true);
  }

  return copy;
};

/**
 * @param archive — архив
 * @param directory — его каталог
 * @param name — имя записи
 * @param maxBytes — предел размера
 * @returns байты записи
 */
const readNamed = async (
  archive: Blob,
  directory: ZipDirectory,
  name: string,
  maxBytes = MAX_BYTES
) => {
  const entry = directory.entries.get(name);

  if (!entry) throw new Error(`нет записи ${name}`);

  const { blob, bytes } = await readZipEntry(archive, entry, { maxBytes });

  expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);

  return bytes;
};

/**
 * @param archive — архив
 * @param name — имя записи
 * @param maxBytes — предел размера
 * @returns прочитанная запись или отказ
 */
const readOne = async (archive: Blob, name: string, maxBytes = MAX_BYTES) => {
  return readNamed(archive, await readZipDirectory(archive, LIMITS), name, maxBytes);
};

const BROKEN = { name: 'ZipError', kind: 'broken' };

describe('readZipDirectory и readZipEntry', () => {
  it('читает stored-архив', async () => {
    const { bytes } = await buildZip([
      { name: 'manifest.json', data: utf8('{}') },
      { name: 'stickers/0.gif', data: GIF_SMALL },
    ]);
    const archive = blobOf(bytes);
    const directory = await readZipDirectory(archive, LIMITS);

    expect(findZipRoot(directory, 'manifest.json')).toBe('');
    await expect(readNamed(archive, directory, 'manifest.json')).resolves.toEqual(
      utf8('{}')
    );
    await expect(readNamed(archive, directory, 'stickers/0.gif')).resolves.toEqual(
      GIF_SMALL
    );
  });

  it('читает deflate с data descriptor и extra только в локальном заголовке', async () => {
    const { bytes } = await buildZip([
      {
        name: 'manifest.json',
        data: utf8(FIXTURE_MANIFEST),
        method: 8,
        hasDataDescriptor: true,
        localExtra: new Uint8Array(9),
      },
      { name: 'stickers/1.gif', data: GIF_LARGE, method: 8, hasDataDescriptor: true },
    ]);
    const archive = blobOf(bytes);
    const directory = await readZipDirectory(archive, LIMITS);

    await expect(readNamed(archive, directory, 'manifest.json')).resolves.toEqual(
      utf8(FIXTURE_MANIFEST)
    );
    await expect(readNamed(archive, directory, 'stickers/1.gif')).resolves.toEqual(
      GIF_LARGE
    );
  });

  it('находит описание в единственной папке верхнего уровня мимо служебных записей', async () => {
    const { bytes } = await buildZip([
      { name: 'Котики/', data: new Uint8Array() },
      { name: 'Котики/stickers/', data: new Uint8Array() },
      { name: 'Котики/.DS_Store', data: utf8('junk'), method: 99 },
      { name: '__MACOSX/', data: new Uint8Array() },
      { name: '__MACOSX/Котики/._manifest.json', data: utf8('xattr'), method: 99 },
      { name: 'Котики/manifest.json', data: utf8('{}'), method: 8 },
      { name: 'Котики/stickers/0.gif', data: GIF_SMALL },
      { name: 'Котики/readme.bin', data: utf8('???'), method: 12 },
    ]);
    const archive = blobOf(bytes);
    const directory = await readZipDirectory(archive, LIMITS);

    expect(findZipRoot(directory, 'manifest.json')).toBe('Котики/');
    expect(directory.entries.has('__MACOSX/')).toBe(false);
    expect(directory.entries.has('__MACOSX/Котики/._manifest.json')).toBe(false);
    await expect(readNamed(archive, directory, 'Котики/stickers/0.gif')).resolves.toEqual(
      GIF_SMALL
    );
    await expect(
      readNamed(archive, directory, 'Котики/readme.bin')
    ).rejects.toMatchObject(BROKEN);
  });

  it('без описания в корне и в единственной папке — корня нет', async () => {
    const twoFolders = await readZipDirectory(
      blobOf(
        (
          await buildZip([
            { name: 'a/manifest.json', data: utf8('{}') },
            { name: 'b/manifest.json', data: utf8('{}') },
          ])
        ).bytes
      ),
      LIMITS
    );
    const photos = await readZipDirectory(
      blobOf((await buildZip([{ name: 'photos/cat.jpg', data: utf8('jpg') }])).bytes),
      LIMITS
    );

    expect(findZipRoot(twoFolders, 'manifest.json')).toBeNull();
    expect(findZipRoot(photos, 'manifest.json')).toBeNull();
  });

  it.each([
    ['zip -r', ZIP_R_ARCHIVE],
    ['ditto -c -k --sequesterRsrc --keepParent', DITTO_ARCHIVE],
  ])('читает архив %s', async (_label, bytes) => {
    const archive = blobOf(bytes);
    const directory = await readZipDirectory(archive, LIMITS);

    expect(findZipRoot(directory, 'manifest.json')).toBe('Котики/');
    await expect(readNamed(archive, directory, 'Котики/manifest.json')).resolves.toEqual(
      utf8(FIXTURE_MANIFEST)
    );
    await expect(readNamed(archive, directory, 'Котики/stickers/0.gif')).resolves.toEqual(
      GIF_SMALL
    );
    await expect(readNamed(archive, directory, 'Котики/stickers/1.gif')).resolves.toEqual(
      GIF_LARGE
    );
  });

  it('у метода 0 отдаёт срез с заданным типом', async () => {
    const archive = await writeZip([{ name: 'a.gif', data: new Blob([GIF_SMALL]) }]);
    const directory = await readZipDirectory(archive, LIMITS);
    const entry = directory.entries.get('a.gif');

    if (!entry) throw new Error('нет записи');

    const { blob } = await readZipEntry(archive, entry, {
      maxBytes: 100,
      type: 'image/gif',
    });

    expect(blob.type).toBe('image/gif');
    expect(blob.size).toBe(GIF_SMALL.byteLength);
  });

  it('принимает комментарий с подложной сигнатурой EOCD внутри', async () => {
    const fake = new Uint8Array(30);

    new DataView(fake.buffer).setUint32(4, 0x06_05_4b_50, true);

    const { bytes } = await buildZip([{ name: 'manifest.json', data: utf8('{}') }], fake);

    await expect(readOne(blobOf(bytes), 'manifest.json')).resolves.toEqual(utf8('{}'));
  });

  it('пропускает записи с опасными именами', async () => {
    const { bytes } = await buildZip([
      { name: '../evil.gif', data: GIF_SMALL },
      { name: '/abs.gif', data: GIF_SMALL },
      { name: 'C:/disk.gif', data: GIF_SMALL },
      { name: 'win\\path.gif', data: GIF_SMALL },
      { name: 'a/../../up.gif', data: GIF_SMALL },
      { name: 'ok..gif', data: GIF_SMALL },
    ]);
    const directory = await readZipDirectory(blobOf(bytes), LIMITS);

    expect([...directory.entries.keys()]).toEqual(['ok..gif']);
  });
});

describe('битый архив', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const twoEntries = () => {
    return buildZip([
      { name: 'manifest.json', data: utf8(FIXTURE_MANIFEST) },
      { name: 'stickers/0.gif', data: GIF_LARGE },
    ]);
  };

  it('не zip', async () => {
    await expect(
      readZipDirectory(blobOf(utf8('просто текст, а не архив')), LIMITS)
    ).rejects.toMatchObject(BROKEN);
    await expect(readZipDirectory(new Blob(), LIMITS)).rejects.toMatchObject(BROKEN);
  });

  it('обрезанный файл', async () => {
    const { bytes } = await twoEntries();

    for (const length of [bytes.byteLength - 1, Math.floor(bytes.byteLength / 2)]) {
      await expect(
        readZipDirectory(blobOf(bytes.slice(0, length)), LIMITS)
      ).rejects.toMatchObject(BROKEN);
    }
  });

  it('данные после конца архива', async () => {
    const { bytes } = await twoEntries();
    const tail = new Uint8Array([...bytes, 0, 0, 0]);

    await expect(readZipDirectory(blobOf(tail), LIMITS)).rejects.toMatchObject(BROKEN);
  });

  it('данные, дописанные перед архивом', async () => {
    const { bytes } = await twoEntries();
    const prefixed = new Uint8Array([...utf8('MZ-stub'), ...bytes]);

    await expect(readZipDirectory(blobOf(prefixed), LIMITS)).rejects.toMatchObject(
      BROKEN
    );
  });

  it('данные между центральным каталогом и его концом', async () => {
    const { bytes, eocdOffset } = await twoEntries();
    const gapped = new Uint8Array([
      ...bytes.subarray(0, eocdOffset),
      ...utf8('junk'),
      ...bytes.subarray(eocdOffset),
    ]);

    await expect(readZipDirectory(blobOf(gapped), LIMITS)).rejects.toMatchObject(BROKEN);
  });

  it.each([
    ['stored', 0],
    ['deflate', 8],
  ])('изменённый байт данных (%s) — расхождение CRC', async (_label, method) => {
    const { bytes, dataOffsets } = await buildZip([
      { name: 'stickers/0.gif', data: GIF_LARGE, method },
    ]);
    const offset = (dataOffsets[0] || 0) + (method === 8 ? 100 : 300);
    const broken = bytes.slice();

    broken[offset] = (broken[offset] || 0) ^ 0x01;
    await expect(readOne(blobOf(broken), 'stickers/0.gif')).rejects.toMatchObject(BROKEN);
  });

  it('данные записи заходят на следующую запись', async () => {
    const { bytes, centralOffsets, dataOffsets } = await twoEntries();
    const central = centralOffsets[0] || 0;
    const dataStart = dataOffsets[0] || 0;
    const grownSize = FIXTURE_MANIFEST.length + 40;

    /**
     * CRC пересчитан по выросшим данным: без проверки границ записей запись прочиталась бы с
     * верной контрольной суммой.
     */
    const grown = patch(
      patch(patch(bytes, central + 20, grownSize), central + 24, grownSize),
      central + 16,
      crc32(bytes.subarray(dataStart, dataStart + grownSize))
    );

    await expect(readOne(blobOf(grown), 'manifest.json')).rejects.toMatchObject(BROKEN);
  });

  it('две записи на одних данных', async () => {
    const { bytes, centralOffsets, localOffsets } = await twoEntries();
    const first = centralOffsets[0] || 0;
    const second = centralOffsets[1] || 0;
    const copied = bytes.slice();

    /**
     * CRC и размеры второй записи — как у первой: без проверки границ записей обе прочитались бы
     * с верной контрольной суммой.
     */
    copied.copyWithin(second + 16, first + 16, first + 28);

    const shared = patch(copied, second + 42, localOffsets[0] || 0);
    const directory = await readZipDirectory(blobOf(shared), LIMITS);

    await expect(
      readNamed(blobOf(shared), directory, 'manifest.json')
    ).rejects.toMatchObject(BROKEN);
    await expect(
      readNamed(blobOf(shared), directory, 'stickers/0.gif')
    ).rejects.toMatchObject(BROKEN);
  });

  it('смещение записи за концом файла', async () => {
    const { bytes, centralOffsets } = await twoEntries();
    const beyond = patch(bytes, (centralOffsets[1] || 0) + 42, bytes.byteLength + 1000);

    await expect(readOne(blobOf(beyond), 'stickers/0.gif')).rejects.toMatchObject(BROKEN);
  });

  it('zip-бомба: распаковка обрывается на размере из каталога', async () => {
    const bomb = new Uint8Array(64 * 1024 * 1024);
    const { bytes, centralOffsets } = await buildZip([
      { name: 'stickers/0.gif', data: bomb, method: 8 },
    ]);
    const lying = patch(bytes, (centralOffsets[0] || 0) + 24, 1000);
    const { counter, CountingDecompressionStream } = countingDecompression();

    vi.stubGlobal('DecompressionStream', CountingDecompressionStream);
    expect(bytes.byteLength).toBeLessThan(1024 * 1024);
    await expect(readOne(blobOf(lying), 'stickers/0.gif')).rejects.toMatchObject(BROKEN);
    expect(counter.bytes).toBeGreaterThan(1000);
    expect(counter.bytes).toBeLessThan(MAX_BYTES);
    await expect(readOne(blobOf(bytes), 'stickers/0.gif')).rejects.toMatchObject(BROKEN);
  });

  it('у записи без сжатия размеры различаются', async () => {
    const { bytes, centralOffsets } = await twoEntries();
    const mismatched = patch(bytes, (centralOffsets[0] || 0) + 24, 10);

    await expect(readOne(blobOf(mismatched), 'manifest.json')).rejects.toMatchObject(
      BROKEN
    );
  });

  it('запись больше предела', async () => {
    const { bytes } = await twoEntries();

    await expect(readOne(blobOf(bytes), 'stickers/0.gif', 100)).rejects.toMatchObject(
      BROKEN
    );
  });

  it('повтор имени', async () => {
    const { bytes } = await buildZip([
      { name: 'stickers/0.gif', data: GIF_SMALL },
      { name: 'stickers/0.gif', data: GIF_LARGE },
    ]);

    await expect(readZipDirectory(blobOf(bytes), LIMITS)).rejects.toMatchObject(BROKEN);
  });

  it.each([
    ['число записей 0xFFFF', 'eocd', 10, 0xff_ff, 2],
    ['смещение каталога 0xFFFFFFFF', 'eocd', 16, 0xff_ff_ff_ff, 4],
    ['сжатый размер записи 0xFFFFFFFF', 'central', 20, 0xff_ff_ff_ff, 4],
    ['смещение записи 0xFFFFFFFF', 'central', 42, 0xff_ff_ff_ff, 4],
  ] as const)('zip64: %s', async (_label, base, field, value, width) => {
    const { bytes, centralOffsets, eocdOffset } = await twoEntries();
    const start = base === 'eocd' ? eocdOffset : centralOffsets[0] || 0;
    const zip64 = patch(bytes, start + field, value, width);

    await expect(readOne(blobOf(zip64), 'manifest.json')).rejects.toMatchObject(BROKEN);
  });

  it('zip64: локатор перед концом каталога', async () => {
    const { bytes, eocdOffset } = await twoEntries();
    const withLocator = patch(bytes, eocdOffset - 20, 0x07_06_4b_50);

    await expect(readZipDirectory(blobOf(withLocator), LIMITS)).rejects.toMatchObject(
      BROKEN
    );
  });

  it('многодисковый архив', async () => {
    const { bytes, eocdOffset } = await twoEntries();
    const multiDisk = patch(bytes, eocdOffset + 4, 1, 2);

    await expect(readZipDirectory(blobOf(multiDisk), LIMITS)).rejects.toMatchObject(
      BROKEN
    );
  });

  it('10 000 стикеров, пересжатые архиватором macOS, — записи `__MACOSX/` в предел не идут', async () => {
    const byte = Uint8Array.of(0);
    const stickers = Array.from({ length: MAX_FILE_STICKERS }, (_, index) => {
      return `${index}.gif`;
    });
    const files = [MANIFEST_FILE, ...stickers];
    const archive = await buildZip([
      { name: 'amo-stickers/', data: new Uint8Array() },
      ...files.map((name) => {
        return { name: `amo-stickers/${name}`, data: byte };
      }),
      { name: '__MACOSX/', data: new Uint8Array() },
      { name: '__MACOSX/amo-stickers/', data: new Uint8Array() },
      ...files.map((name) => {
        return { name: `__MACOSX/amo-stickers/._${name}`, data: byte };
      }),
    ]);

    const { entries } = await readZipDirectory(blobOf(archive.bytes), {
      maxEntries: MAX_ZIP_ENTRIES,
    });

    expect(entries.has(`amo-stickers/${MANIFEST_FILE}`)).toBe(true);
    expect(entries.has(`amo-stickers/${MAX_FILE_STICKERS - 1}.gif`)).toBe(true);
    expect(entries.size).toBe(files.length + 1);
  });

  it('записи `__MACOSX/` не идут в предел, остальные — идут', async () => {
    const archive = await buildZip([
      { name: 'a.gif', data: GIF_SMALL },
      { name: '__MACOSX/._a.gif', data: utf8('xattr') },
      { name: 'b.gif', data: GIF_SMALL },
    ]);

    await expect(
      readZipDirectory(blobOf(archive.bytes), { maxEntries: 2 })
    ).resolves.toBeDefined();
    await expect(
      readZipDirectory(blobOf(archive.bytes), { maxEntries: 1 })
    ).rejects.toMatchObject({ name: 'ZipError', kind: 'tooLarge' });
  });

  it('записей больше предела — tooLarge', async () => {
    const { bytes } = await twoEntries();

    await expect(
      readZipDirectory(blobOf(bytes), { maxEntries: 1 })
    ).rejects.toMatchObject({ name: 'ZipError', kind: 'tooLarge' });
  });

  it('записей в конце каталога заведомо больше предела — tooLarge без чтения каталога', async () => {
    const { bytes } = await twoEntries();
    const eocd = bytes.byteLength - 22;
    const centralOffset = new DataView(bytes.buffer).getUint32(eocd + 16, true);
    const inflated = patch(patch(bytes, eocd + 8, 60_000, 2), eocd + 10, 60_000, 2);
    const archive = blobOf(inflated);
    const slice = vi.spyOn(archive, 'slice');

    await expect(
      readZipDirectory(archive, { maxEntries: MAX_ZIP_ENTRIES })
    ).rejects.toMatchObject({ name: 'ZipError', kind: 'tooLarge' });
    expect(
      slice.mock.calls.some(([start]) => {
        return start === centralOffset;
      })
    ).toBe(false);
  });
});
