import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Pack, StickerRec } from '../src/core/db.types';
import { inspectGif } from '../src/core/gif';
import { t } from '../src/core/i18n/translate';
import { MAX_FILE_STICKERS, MAX_STICKER_BYTES } from '../src/core/libraryFile/limits';
import { prepareImport } from '../src/core/libraryFile/prepareImport';
import type { FileImportProgress } from '../src/core/libraryFile/prepareImport.types';
import { loadFileCard, readLibraryFile } from '../src/core/libraryFile/readLibraryFile';
import { writeZip } from '../src/core/zip/zipWrite';

import { makeGif } from './helpers/makeGif';
import { buildZip } from './helpers/zipBuild';

/**
 * Библиотека, которую видит загрузка через `listPacks` и `listStickerIds`.
 */
const library = vi.hoisted(() => {
  return { packs: [] as Pack[], stickers: [] as StickerRec[] };
});

vi.mock('../src/core/db', () => {
  return {
    CUSTOM_PACK_ID: 'custom',
    listPacks: vi.fn(async () => {
      return library.packs;
    }),
    listStickerIds: vi.fn(async () => {
      return library.stickers.map(({ id }) => {
        return id;
      });
    }),
  };
});

afterEach(() => {
  library.packs = [];
  library.stickers = [];
});

/**
 * Тексты ошибок — из словаря: в нём неразрывные пробелы typograf.
 */
const NOT_OURS = t('error.libraryFile.notOurs');
const BROKEN = t('error.libraryFile.broken');
const INVALID = t('error.libraryFile.invalid');
const TOO_NEW = t('error.libraryFile.tooNew');
const TOO_BIG = t('error.libraryFile.tooBig', { max: MAX_FILE_STICKERS });
const EMPTY = t('error.libraryFile.empty');

/**
 * Стикер пака в описании файла до назначения ему записи архива.
 */
type StickerSpec = {
  /**
   * Id стикера.
   */
  id: string;

  /**
   * Эмодзи стикера.
   */
  emoji?: string;

  /**
   * Подпись своего стикера.
   */
  caption?: string;
};

/**
 * Пак описания: поля пака как в файле, стикеры — без `file`.
 */
type PackSpec = Record<string, unknown> & {
  /**
   * Id пака.
   */
  id: string;

  /**
   * Стикеры пака.
   */
  stickers: StickerSpec[];
};

/**
 * Запись архива.
 */
type Entry = {
  /**
   * Путь в архиве.
   */
  name: string;

  /**
   * Содержимое.
   */
  data: Uint8Array<ArrayBuffer>;
};

/**
 * GIF стикера по его номеру в файле: стороны разные, поэтому и байты у всех разные.
 *
 * @param n — номер стикера
 * @returns байты GIF
 */
const gifOf = (n: number) => {
  return makeGif(10 + n, 8 + (n % 7), 2);
};

const ENCODER = new TextEncoder();

/**
 * Пак своих стикеров с `count` стикерами.
 *
 * @param count — число стикеров
 * @param prefix — начало id стикеров
 * @returns пак описания
 */
const customPack = (count: number, prefix = 'own'): PackSpec => {
  return {
    id: 'custom',
    source: 'custom',
    title: 'Мои стикеры',
    stickers: Array.from({ length: count }, (_, n) => {
      return { id: `${prefix}${n}`, caption: `подпись ${n}` };
    }),
  };
};

/**
 * Пак Telegram с `count` стикерами.
 *
 * @param name — имя набора
 * @param count — число стикеров
 * @param extra — поля пака поверх
 * @returns пак описания
 */
const tgPack = (
  name: string,
  count: number,
  extra: Record<string, unknown> = {}
): PackSpec => {
  return {
    id: `tg:${name}`,
    source: 'telegram',
    title: name,
    sourceRef: name,
    stickers: Array.from({ length: count }, (_, n) => {
      return { id: `tg:${name}${n}`, emoji: '😀' };
    }),
    ...extra,
  };
};

/**
 * Записи архива файла выгрузки: описание и GIF стикеров `stickers/<номер>.gif` подряд по всем пакам.
 *
 * @param packs — паки
 * @param manifestExtra — поля описания поверх
 * @returns записи архива и GIF по id стикера
 */
const entriesOf = (packs: PackSpec[], manifestExtra: Record<string, unknown> = {}) => {
  const gifs = new Map<string, Uint8Array<ArrayBuffer>>();
  const files: Entry[] = [];
  let n = 0;

  const manifestPacks = packs.map((pack) => {
    return {
      ...pack,
      stickers: pack.stickers.map((sticker) => {
        const file = `stickers/${n}.gif`;
        const data = gifOf(n);

        n += 1;
        gifs.set(sticker.id, data);
        files.push({ name: file, data });

        return { ...sticker, file };
      }),
    };
  });

  const manifest = {
    format: 'amo-stickers',
    version: 1,
    packs: manifestPacks,
    ...manifestExtra,
  };

  return {
    entries: [
      { name: 'manifest.json', data: ENCODER.encode(JSON.stringify(manifest)) },
      ...files,
    ],
    gifs,
  };
};

/**
 * Файл выгрузки собственной упаковкой — так, как его пишет выгрузка.
 *
 * @param entries — записи
 * @returns архив
 */
const ownZip = async (entries: Entry[]) => {
  return writeZip(
    entries.map(({ name, data }) => {
      return { name, data: new Blob([data]) };
    })
  );
};

/**
 * Файл выгрузки из паков.
 *
 * @param packs — паки
 * @returns архив и GIF по id стикера
 */
const libraryFileOf = async (packs: PackSpec[]) => {
  const { entries, gifs } = entriesOf(packs);

  return { blob: await ownZip(entries), gifs };
};

/**
 * @param haystack — где искать
 * @param needle — что искать
 * @returns смещение первого вхождения; -1 — нет
 */
const indexOfBytes = (haystack: Uint8Array, needle: Uint8Array) => {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }

    return i;
  }

  return -1;
};

/**
 * @param id — id пака
 * @returns запись пака в библиотеке
 */
const libraryPack = (id: string): Pack => {
  return {
    id,
    title: id,
    source: id === 'custom' ? 'custom' : 'telegram',
    createdAt: 1,
  };
};

/**
 * @param id — id стикера
 * @param packId — пак стикера
 * @returns запись стикера в библиотеке
 */
const librarySticker = (id: string, packId: string): StickerRec => {
  return { id, packId, blob: new Blob(), width: 1, height: 1, createdAt: 1 };
};

/**
 * Карточка файла по библиотеке-заглушке.
 *
 * @param packs — паки файла
 * @returns карточка
 */
const cardOf = async (packs: PackSpec[]) => {
  const { blob } = await libraryFileOf(packs);

  return loadFileCard(await readLibraryFile(blob));
};

describe('readLibraryFile', () => {
  it('читает описание и находит запись каждого стикера', async () => {
    const { blob } = await libraryFileOf([customPack(2), tgPack('Gachi', 3)]);
    const { manifest, entries } = await readLibraryFile(blob);

    expect(
      manifest.packs.map(({ id }) => {
        return id;
      })
    ).toEqual(['custom', 'tg:Gachi']);
    expect([...entries.keys()]).toEqual([
      'own0',
      'own1',
      'tg:Gachi0',
      'tg:Gachi1',
      'tg:Gachi2',
    ]);
  });

  it('читает архив, пересжатый архиватором из папки', async () => {
    const { entries, gifs } = entriesOf([customPack(1), tgPack('Gachi', 2)]);
    const { bytes } = await buildZip([
      { name: 'amo-stickers/', data: new Uint8Array() },
      ...entries.map(({ name, data }) => {
        return { name: `amo-stickers/${name}`, data, method: 8, hasDataDescriptor: true };
      }),
      { name: 'amo-stickers/.DS_Store', data: ENCODER.encode('mac'), method: 12 },
      { name: '__MACOSX/amo-stickers/._manifest.json', data: ENCODER.encode('mac') },
    ]);
    const libraryFile = await readLibraryFile(new Blob([bytes]));
    const plan = await prepareImport(libraryFile, await loadFileCard(libraryFile));
    const stickers = plan.packs.flatMap((pack) => {
      return pack.stickers;
    });

    expect(stickers).toHaveLength(3);

    for (const { id, blob } of stickers) {
      expect(new Uint8Array(await blob.arrayBuffer())).toEqual(gifs.get(id));
    }
  });

  it('zip с фотографиями — не файл amo stickers', async () => {
    const blob = await ownZip([
      { name: 'IMG_0001.gif', data: gifOf(0) },
      { name: 'IMG_0002.gif', data: gifOf(1) },
    ]);

    await expect(readLibraryFile(blob)).rejects.toThrow(NOT_OURS);
  });

  it('не zip вовсе — не файл amo stickers', async () => {
    await expect(readLibraryFile(new Blob([gifOf(0)]))).rejects.toThrow(NOT_OURS);
    await expect(readLibraryFile(new Blob([]))).rejects.toThrow(NOT_OURS);
  });

  it('manifest.json чужого формата или не JSON — не файл amo stickers', async () => {
    const extension = await ownZip([
      { name: 'manifest.json', data: ENCODER.encode('{"manifest_version":3}') },
    ]);
    const text = await ownZip([
      { name: 'manifest.json', data: ENCODER.encode('привет') },
    ]);

    await expect(readLibraryFile(extension)).rejects.toThrow(NOT_OURS);
    await expect(readLibraryFile(text)).rejects.toThrow(NOT_OURS);
  });

  it('обрезанный файл — битый файл', async () => {
    const { blob } = await libraryFileOf([tgPack('Gachi', 5)]);

    await expect(readLibraryFile(blob.slice(0, blob.size / 2))).rejects.toThrow(BROKEN);
  });

  it('файл новой версии — совет обновить amo stickers', async () => {
    const { entries } = entriesOf([tgPack('Gachi', 1)], { version: 2 });

    await expect(readLibraryFile(await ownZip(entries))).rejects.toThrow(TOO_NEW);
  });

  it('описание с ошибкой и пустое описание', async () => {
    const invalid = entriesOf([tgPack('Gachi', 1, { source: 'custom' })]);
    const empty = entriesOf([customPack(0)]);

    await expect(readLibraryFile(await ownZip(invalid.entries))).rejects.toThrow(INVALID);
    await expect(readLibraryFile(await ownZip(empty.entries))).rejects.toThrow(EMPTY);
  });

  it('файл от 4 ГиБ — слишком большой, до чтения каталога', async () => {
    const { blob } = await libraryFileOf([tgPack('Gachi', 1)]);
    const slice = vi.spyOn(blob, 'slice');

    Object.defineProperty(blob, 'size', { value: 2 ** 32 });

    await expect(readLibraryFile(blob)).rejects.toThrow(TOO_BIG);
    expect(slice).not.toHaveBeenCalled();
  });

  it('стикер ссылается на запись, которой нет, — битый файл', async () => {
    const { entries } = entriesOf([tgPack('Gachi', 2)]);
    const withoutGif = entries.filter(({ name }) => {
      return name !== 'stickers/1.gif';
    });

    await expect(readLibraryFile(await ownZip(withoutGif))).rejects.toThrow(BROKEN);
  });

  it('запись стикера больше предела GIF — битый файл, на пределе — читается', async () => {
    /**
     * @param size — несжатый размер записи `stickers/1.gif`
     * @returns архив, где эта запись сжата deflate: на диске она мала, предел — по несжатому размеру
     */
    const zipWithGifOf = async (size: number) => {
      const { entries } = entriesOf([tgPack('Gachi', 2)]);
      const { bytes } = await buildZip(
        entries.map(({ name, data }) => {
          if (name !== 'stickers/1.gif') return { name, data };

          return { name, data: new Uint8Array(size), method: 8 };
        })
      );

      return new Blob([bytes]);
    };

    await expect(
      readLibraryFile(await zipWithGifOf(MAX_STICKER_BYTES + 1))
    ).rejects.toThrow(BROKEN);
    await expect(
      readLibraryFile(await zipWithGifOf(MAX_STICKER_BYTES))
    ).resolves.toMatchObject({ entries: expect.any(Map) });
  });
});

describe('loadFileCard', () => {
  it('карточка нового файла: «Мои стикеры» не новый пак, итог — новые паки и стикеры', async () => {
    const card = await cardOf([customPack(3), tgPack('Kotiki', 45)]);
    const [custom, kotiki] = card.packs;

    expect(custom).toMatchObject({ isInLibrary: false, isNew: false });
    expect(custom?.newStickers).toHaveLength(3);
    expect(kotiki).toMatchObject({ isInLibrary: false, isNew: true });
    expect(kotiki?.newStickers).toHaveLength(45);
    expect(card).toMatchObject({
      stickerCount: 48,
      newStickerCount: 48,
      newPackCount: 1,
    });
  });

  it('«Мои стикеры», которые уже есть, — тоже не новый пак', async () => {
    library.packs = [libraryPack('custom')];

    const card = await cardOf([customPack(2)]);

    expect(card.packs[0]).toMatchObject({ isInLibrary: true, isNew: false });
    expect(card).toMatchObject({ newStickerCount: 2, newPackCount: 0 });
  });

  it('пак уже в библиотеке с 40 из 45 стикеров — добавится 5 в порядке файла', async () => {
    library.packs = [libraryPack('tg:Kotiki')];
    library.stickers = Array.from({ length: 40 }, (_, n) => {
      return librarySticker(`tg:Kotiki${n}`, 'tg:Kotiki');
    });

    const card = await cardOf([tgPack('Kotiki', 45)]);
    const [kotiki] = card.packs;

    expect(kotiki).toMatchObject({ isInLibrary: true, isNew: false });
    expect(
      kotiki?.newStickers.map(({ id }) => {
        return id;
      })
    ).toEqual([
      'tg:Kotiki40',
      'tg:Kotiki41',
      'tg:Kotiki42',
      'tg:Kotiki43',
      'tg:Kotiki44',
    ]);
    expect(card).toMatchObject({ stickerCount: 45, newStickerCount: 5, newPackCount: 0 });
  });

  it('всё уже в библиотеке — новых стикеров нет', async () => {
    library.packs = [libraryPack('custom'), libraryPack('tg:Kotiki')];
    library.stickers = [
      ...['own0', 'own1'].map((id) => {
        return librarySticker(id, 'custom');
      }),
      ...['tg:Kotiki0', 'tg:Kotiki1'].map((id) => {
        return librarySticker(id, 'tg:Kotiki');
      }),
    ];

    const card = await cardOf([customPack(2), tgPack('Kotiki', 2)]);

    expect(card).toMatchObject({ stickerCount: 4, newStickerCount: 0, newPackCount: 0 });
  });

  it('id стикера занят в другом паке — стикер не новый, без ошибки', async () => {
    library.packs = [libraryPack('tg:Other')];
    library.stickers = [librarySticker('tg:Kotiki1', 'tg:Other')];

    const card = await cardOf([tgPack('Kotiki', 3)]);

    expect(
      card.packs[0]?.newStickers.map(({ id }) => {
        return id;
      })
    ).toEqual(['tg:Kotiki0', 'tg:Kotiki2']);
    expect(card).toMatchObject({ newStickerCount: 2, newPackCount: 1 });
  });

  it('новый пак, все стикеры которого заняты, не создаётся', async () => {
    library.stickers = [librarySticker('tg:Kotiki0', 'tg:Other')];

    const card = await cardOf([tgPack('Kotiki', 1)]);

    expect(card.packs[0]).toMatchObject({ isInLibrary: false, isNew: false });
    expect(card.newPackCount).toBe(0);
  });

  it('пересчитывается по библиотеке: пак удалили — снова новый', async () => {
    library.packs = [libraryPack('tg:Kotiki')];
    library.stickers = [librarySticker('tg:Kotiki0', 'tg:Kotiki')];

    const { blob } = await libraryFileOf([tgPack('Kotiki', 2)]);
    const libraryFile = await readLibraryFile(blob);

    expect((await loadFileCard(libraryFile)).newStickerCount).toBe(1);
    library.packs = [];
    library.stickers = [];
    expect(await loadFileCard(libraryFile)).toMatchObject({
      newStickerCount: 2,
      newPackCount: 1,
    });
  });
});

describe('prepareImport', () => {
  it('план: новые стикеры в порядке файла, стороны из GIF, поля пака из файла', async () => {
    library.packs = [libraryPack('tg:Old')];
    library.stickers = [librarySticker('tg:Old0', 'tg:Old')];

    const { blob, gifs } = await libraryFileOf([
      customPack(1),
      tgPack('Old', 1),
      tgPack('Kotiki', 2, { createdAt: 5, usedAt: 9, coverId: 'tg:Kotiki1' }),
    ]);
    const libraryFile = await readLibraryFile(blob);
    const progress: FileImportProgress[] = [];
    const plan = await prepareImport(libraryFile, await loadFileCard(libraryFile), {
      onProgress: (p) => {
        progress.push(p);
      },
    });
    const kotiki1 = inspectGif(gifs.get('tg:Kotiki1') || new Uint8Array());

    expect(
      plan.packs.map(({ id }) => {
        return id;
      })
    ).toEqual(['custom', 'tg:Kotiki']);
    expect(plan.packs[0]?.stickers[0]).toMatchObject({
      id: 'own0',
      caption: 'подпись 0',
    });
    expect(plan.packs[1]).toMatchObject({
      id: 'tg:Kotiki',
      source: 'telegram',
      title: 'Kotiki',
      sourceRef: 'Kotiki',
      createdAt: 5,
      usedAt: 9,
      coverId: 'tg:Kotiki1',
    });
    expect(plan.packs[1]?.stickers[1]).toMatchObject({
      id: 'tg:Kotiki1',
      emoji: '😀',
      width: kotiki1?.width,
      height: kotiki1?.height,
    });
    expect(plan.packs[1]?.stickers[1]?.blob.type).toBe('image/gif');
    expect(progress).toEqual(
      [0, 1, 2, 3].map((done) => {
        return { done, total: 3 };
      })
    );
  });

  it('один изменённый байт в середине одного из 30 GIF — битый файл', async () => {
    const { blob, gifs } = await libraryFileOf([tgPack('Kotiki', 30)]);
    const gif = gifs.get('tg:Kotiki17') || new Uint8Array();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const half = Math.floor(gif.length / 2);
    const middle = indexOfBytes(bytes, gif) + half;
    const corrupted = new Uint8Array(gif);

    corrupted[half] = (corrupted[half] || 0) ^ 0x01;
    /**
     * Порча внутри LZW-данных: разбор GIF её не видит, ловит только CRC архива.
     */
    expect(inspectGif(corrupted)).not.toBeNull();
    bytes[middle] = (bytes[middle] || 0) ^ 0x01;

    const libraryFile = await readLibraryFile(new Blob([bytes]));

    await expect(
      prepareImport(libraryFile, await loadFileCard(libraryFile))
    ).rejects.toThrow(BROKEN);
  });

  it('целая запись, но не GIF — битый файл', async () => {
    const { entries } = entriesOf([tgPack('Kotiki', 2)]);
    const notGif = entries.map((entry) => {
      return entry.name === 'stickers/1.gif'
        ? { ...entry, data: ENCODER.encode('PNG, а не GIF') }
        : entry;
    });
    const libraryFile = await readLibraryFile(await ownZip(notGif));

    await expect(
      prepareImport(libraryFile, await loadFileCard(libraryFile))
    ).rejects.toThrow(BROKEN);
  });

  it('отмена между стикерами останавливает проверку', async () => {
    const { blob } = await libraryFileOf([tgPack('Kotiki', 5)]);
    const libraryFile = await readLibraryFile(blob);
    const card = await loadFileCard(libraryFile);
    const controller = new AbortController();
    const reason = new Error('отмена');
    const done: number[] = [];

    const preparing = prepareImport(libraryFile, card, {
      signal: controller.signal,
      onProgress: (p) => {
        done.push(p.done);
        if (p.done === 2) controller.abort(reason);
      },
    });

    await expect(preparing).rejects.toBe(reason);
    expect(done).toEqual([0, 1, 2]);
  });

  it('отмена после последнего стикера не отдаёт план', async () => {
    const { blob } = await libraryFileOf([tgPack('Kotiki', 1)]);
    const libraryFile = await readLibraryFile(blob);
    const controller = new AbortController();
    const reason = new Error('отмена');

    const preparing = prepareImport(libraryFile, await loadFileCard(libraryFile), {
      signal: controller.signal,
      onProgress: (p) => {
        if (p.done === 1) controller.abort(reason);
      },
    });

    await expect(preparing).rejects.toBe(reason);
  });
});
