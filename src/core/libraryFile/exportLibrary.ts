import {
  getPack,
  listAllRecent,
  listAllStickers,
  listFavorites,
  listPacks,
  listStickers,
} from '@core/db';
import type { FavoriteRec, RecentRec, RemoteGif, StickerRec } from '@core/db.types';
import { isStickerFavorite } from '@core/db.types';
import { t } from '@core/i18n';
import { BYTES_IN_MB, isAllowedUrl } from '@core/net';
import { orderPacks } from '@core/packOrder';
import { packTitle } from '@core/packTitle';
import type { ZipWriteEntry } from '@core/zip';
import { writeZip, ZipError } from '@core/zip';
import { isDimension } from '@shared/guards';

import { libraryFileName, packFileName } from './exportFileName';
import type {
  ExportLists,
  ExportOptions,
  ExportPack,
  ExportSections,
  LibraryExport,
} from './exportLibrary.types';
import {
  clampGraphemes,
  FORMAT_NAME,
  FORMAT_VERSION,
  MANIFEST_FILE,
  MAX_CAPTION_GRAPHEMES,
  MAX_EMOJI_GRAPHEMES,
  MAX_FILE_STICKERS,
  MAX_GIF_ID_LENGTH,
  MAX_STICKER_BYTES,
  MAX_TITLE_GRAPHEMES,
  MAX_URL_LENGTH,
} from './limits';
import type {
  LibraryManifest,
  ManifestFavorite,
  ManifestGif,
  ManifestPack,
  ManifestRecent,
  ManifestSticker,
} from './manifest.types';
import { parseManifest } from './manifest.types';

/**
 * Каталог GIF в архиве. Имена записей — только ASCII: архиватор macOS не распаковывает запись с не-ASCII именем.
 */
const STICKERS_DIR = 'stickers/';

/**
 * Файл не помещается в пределы формата.
 *
 * @param isLibrary — выгружается вся библиотека, а не пак
 * @returns ошибка: библиотеке — с советом выгружать паки по одному
 */
const tooBigError = (isLibrary: boolean) => {
  const params = { max: MAX_FILE_STICKERS };

  if (isLibrary) return new Error(t('error.libraryFile.exportTooBig', params));

  return new Error(t('error.libraryFile.packTooBig', params));
};

/**
 * Выгружать нечего: кнопка и пункт меню у пустой библиотеки и пустого пака недоступны, и сюда доходит только гонка
 * с удалением.
 *
 * @param isLibrary — выгружается вся библиотека, а не пак
 * @returns ошибка
 */
const emptyError = (isLibrary: boolean) => {
  if (isLibrary) return new Error(t('error.libraryFile.libraryExportEmpty'));

  return new Error(t('error.libraryFile.packExportEmpty'));
};

/**
 * Паки выгрузки в порядке ленты без снимка — порядок, в котором их увидит пользователь при открытии попапа, —
 * без пустых паков.
 *
 * @param packId — пак; undefined — вся библиотека
 * @returns паки со стикерами
 */
const loadPacks = async (packId: string | undefined): Promise<ExportPack[]> => {
  if (packId !== undefined) {
    const [pack, stickers] = await Promise.all([getPack(packId), listStickers(packId)]);

    return pack && stickers.length ? [{ pack, stickers }] : [];
  }

  const [packs, stickersByPack] = await Promise.all([listPacks(), listAllStickers()]);

  return orderPacks(packs, null).reduce<ExportPack[]>((acc, pack) => {
    const stickers = stickersByPack.get(pack.id);

    if (stickers?.length) acc.push({ pack, stickers });

    return acc;
  }, []);
};

/**
 * Избранное и недавние — только у выгрузки библиотеки: выгрузку пака пересылают другим людям, и она не раскрывает, что
 * человек отправлял и отмечал.
 *
 * @param isLibrary — выгружается вся библиотека
 * @returns избранное и недавние обоих видов от новых к старым; у выгрузки пака — пустые
 */
const loadLists = async (isLibrary: boolean): Promise<ExportLists> => {
  if (!isLibrary) return { favorites: [], recent: [] };
  const [favorites, allRecent] = await Promise.all([listFavorites(), listAllRecent()]);
  const recent = allRecent.sort((a, b) => {
    return b.ts - a.ts;
  });

  return { favorites, recent };
};

/**
 * Ссылка GIF, которую примет загрузка: длиннее предела или вне сетевой политики — нет.
 *
 * @param url — ссылка из записи базы
 * @returns true — ссылку можно писать в файл
 */
const isFormatUrl = (url: string) => {
  return url.length <= MAX_URL_LENGTH && isAllowedUrl(url);
};

/**
 * GIF из записи базы для файла. GIF, которую загрузка не примет, пропускается, а не роняет выгрузку: одна запись не того
 * вида не должна лишать человека переноса всей библиотеки.
 *
 * @param gif — GIF из поиска
 * @returns GIF описания с урезанным названием; null — загрузка её не примет
 */
const toManifestGif = (gif: RemoteGif): ManifestGif | null => {
  const { provider, id, url, previewUrl, width, height } = gif;

  if (!id || id.length > MAX_GIF_ID_LENGTH) return null;
  if (!isFormatUrl(url) || !isFormatUrl(previewUrl)) return null;
  if (!isDimension(width) || !isDimension(height)) return null;
  const title = clampOptional(gif.title, MAX_TITLE_GRAPHEMES);

  return {
    provider,
    id,
    ...(title === undefined ? {} : { title }),
    url,
    previewUrl,
    width,
    height,
  };
};

/**
 * @param rec — запись избранного
 * @param exportedIds — id стикеров паков файла
 * @param snapshots — записи GIF снимков; снимок дописывает сюда свою
 * @param firstFile — номер первого GIF снимков в архиве
 * @returns элемент избранного; null — GIF, которую загрузка не примет
 */
const toManifestFavorite = (
  rec: FavoriteRec,
  exportedIds: ReadonlySet<string>,
  snapshots: ZipWriteEntry[],
  firstFile: number
): ManifestFavorite | null => {
  const { ts } = rec;

  if (!isStickerFavorite(rec)) {
    const gif = toManifestGif(rec.item.gif);

    return gif ? { kind: 'gif', ts, gif } : null;
  }

  const { stickerId } = rec.item;

  if (exportedIds.has(stickerId)) return { kind: 'sticker', id: stickerId, ts };
  const file = `${STICKERS_DIR}${firstFile + snapshots.length}.gif`;

  snapshots.push({ name: file, data: rec.sticker.blob });
  const { emoji, caption } = toManifestSticker(rec.sticker, file);

  return {
    kind: 'sticker',
    id: stickerId,
    ts,
    file,
    packId: rec.sticker.packId,
    ...(emoji === undefined ? {} : { emoji }),
    ...(caption === undefined ? {} : { caption }),
  };
};

/**
 * @param rec — запись недавних
 * @param exportedIds — id стикеров паков файла
 * @returns недавний элемент; null — стикер не выгружается или GIF, которую загрузка не примет
 */
const toManifestRecent = (
  rec: RecentRec,
  exportedIds: ReadonlySet<string>
): ManifestRecent | null => {
  const { ts, item } = rec;

  switch (item.kind) {
    case 'local': {
      return exportedIds.has(item.stickerId)
        ? { kind: 'sticker', id: item.stickerId, ts }
        : null;
    }

    case 'remote': {
      const gif = toManifestGif(item.gif);

      return gif ? { kind: 'gif', ts, gif } : null;
    }

    default: {
      throw new Error(`Неизвестный вид элемента: ${String(item satisfies never)}`);
    }
  }
};

/**
 * Избранный стикер, который выгружается в паке файла, — ссылка на него, а не второй GIF; остальные несут свой GIF после
 * стикеров паков. Недавний стикер — только выгружаемый: без него он не показывается и на новом месте.
 *
 * @param packs — паки выгрузки
 * @param lists — избранное и недавние
 * @returns разделы описания и записи GIF снимков
 */
const buildSections = (packs: ExportPack[], lists: ExportLists): ExportSections => {
  const exportedIds = new Set<string>();

  for (const { stickers } of packs) {
    for (const { id } of stickers) exportedIds.add(id);
  }

  const snapshots: ZipWriteEntry[] = [];

  const favorites = lists.favorites.reduce<ManifestFavorite[]>((acc, rec) => {
    const item = toManifestFavorite(rec, exportedIds, snapshots, exportedIds.size);

    if (item) acc.push(item);

    return acc;
  }, []);

  const recent = lists.recent.reduce<ManifestRecent[]>((acc, rec) => {
    const item = toManifestRecent(rec, exportedIds);

    if (item) acc.push(item);

    return acc;
  }, []);

  return { favorites, recent, snapshots };
};

/**
 * Пределы формата до сборки архива: файл, который не прочитать, не сохраняется вовсе. Снимки избранного — такие же
 * стикеры файла: они в пределе числа и веса.
 *
 * @param packs — паки выгрузки
 * @param sections — разделы описания и GIF снимков
 * @param isLibrary — выгружается вся библиотека
 * @returns число стикеров вместе со снимками
 */
const checkLimits = (
  packs: ExportPack[],
  sections: ExportSections,
  isLibrary: boolean
) => {
  const { favorites, recent, snapshots } = sections;
  let count = snapshots.length;

  for (const { stickers } of packs) count += stickers.length;

  /**
   * Недавний стикер и ссылка избранного без стикеров паков не пишутся, поэтому непустые разделы при нуле стикеров —
   * это GIF.
   */
  if (!count && !favorites.length && !recent.length) throw emptyError(isLibrary);
  if (count > MAX_FILE_STICKERS) throw tooBigError(isLibrary);

  for (const { pack, stickers } of packs) {
    const isTooHeavy = stickers.some(({ blob }) => {
      return blob.size > MAX_STICKER_BYTES;
    });

    if (isTooHeavy) {
      throw new Error(
        t('error.libraryFile.gifTooBig', {
          title: packTitle(pack),
          size: MAX_STICKER_BYTES / BYTES_IN_MB,
        })
      );
    }
  }

  const isSnapshotTooHeavy = snapshots.some(({ data }) => {
    return data.size > MAX_STICKER_BYTES;
  });

  if (isSnapshotTooHeavy) {
    throw new Error(
      t('error.libraryFile.favoriteGifTooBig', { size: MAX_STICKER_BYTES / BYTES_IN_MB })
    );
  }

  return count;
};

/**
 * Пустая строка после урезания — то же, что отсутствие: чтение так же её отбрасывает.
 *
 * @param text — эмодзи или подпись
 * @param maxGraphemes — предел формата
 * @returns урезанная строка; undefined — строки нет
 */
const clampOptional = (text: string | undefined, maxGraphemes: number) => {
  return text ? clampGraphemes(text, maxGraphemes) || undefined : undefined;
};

/**
 * @param sticker — запись стикера
 * @param file — путь его GIF в архиве
 * @returns стикер описания: без сторон и времени — их загрузка берёт из GIF и задаёт заново
 */
const toManifestSticker = (sticker: StickerRec, file: string): ManifestSticker => {
  const emoji = clampOptional(sticker.emoji, MAX_EMOJI_GRAPHEMES);
  const caption = clampOptional(sticker.caption, MAX_CAPTION_GRAPHEMES);

  return {
    id: sticker.id,
    file,
    ...(emoji === undefined ? {} : { emoji }),
    ...(caption === undefined ? {} : { caption }),
  };
};

/**
 * Описание и записи GIF архива. Время пака — только в выгрузке библиотеки: выгрузку пака пересылают другим людям, и
 * она не раскрывает, когда из пака отправляли. Обложка — только стикер, который есть в паке. Пустой раздел не пишется:
 * его отсутствие и пустота читаются одинаково.
 *
 * @param packs — паки выгрузки
 * @param sections — разделы описания и GIF снимков
 * @param isLibrary — выгружается вся библиотека
 * @returns описание и записи GIF в порядке описания: стикеры паков, затем снимки
 */
const buildManifest = (
  packs: ExportPack[],
  sections: ExportSections,
  isLibrary: boolean
) => {
  const { favorites, recent, snapshots } = sections;
  const entries: ZipWriteEntry[] = [];

  const manifestPacks = packs.map<ManifestPack>(({ pack, stickers }) => {
    const { id, source, title, sourceRef, coverId, createdAt, usedAt } = pack;
    const hasCover = stickers.some((sticker) => {
      return sticker.id === coverId;
    });

    const manifestStickers = stickers.map((sticker) => {
      const file = `${STICKERS_DIR}${entries.length}.gif`;

      entries.push({ name: file, data: sticker.blob });

      return toManifestSticker(sticker, file);
    });

    return {
      id,
      source,
      title: clampGraphemes(title, MAX_TITLE_GRAPHEMES),
      ...(source === 'telegram' && sourceRef ? { sourceRef } : {}),
      ...(isLibrary ? { createdAt } : {}),
      ...(isLibrary && usedAt !== undefined ? { usedAt } : {}),
      ...(hasCover && coverId ? { coverId } : {}),
      stickers: manifestStickers,
    };
  });

  const manifest: LibraryManifest = {
    format: FORMAT_NAME,
    version: FORMAT_VERSION,
    packs: manifestPacks,
    ...(favorites.length ? { favorites } : {}),
    ...(recent.length ? { recent } : {}),
  };

  return { manifest, entries: [...entries, ...snapshots] };
};

/**
 * Прогоняет текст описания через гард чтения: выгрузка не сохраняет то, чего не прочитает. Отказ возможен только у
 * записи базы не того вида, что пишет amo stickers.
 *
 * @param text — `manifest.json`
 * @param isLibrary — выгружается вся библиотека
 */
const checkManifest = (text: string, isLibrary: boolean) => {
  const result = parseManifest(JSON.parse(text));

  if (!('error' in result)) return;

  switch (result.error) {
    case 'tooBig': {
      throw tooBigError(isLibrary);
    }

    case 'empty': {
      throw emptyError(isLibrary);
    }

    case 'notOurs':

    case 'tooNew':

    case 'invalid': {
      throw new Error(t('error.libraryFile.exportInvalid'));
    }

    default: {
      throw new Error(
        `Неизвестная причина отказа описания: ${String(result.error satisfies never)}`
      );
    }
  }
};

/**
 * Выгружает пак или всю библиотеку в файл `.amostickers`, ничего не записывая в базу: время использования паков,
 * избранное и недавние не меняются. Пределы формата проверяются до сборки архива — неполный файл не собирается.
 * Настроек (ключей, токена) и режима попапа в файле нет; избранное и недавние — только у библиотеки.
 *
 * Ошибки — на языке интерфейса: выгружать нечего, файл больше предела формата, GIF больше предела с названием пака или
 * в избранном, запись базы, которую не прочитает загрузка.
 *
 * @param options — пак, момент выгрузки и ход
 * @returns архив, имя файла и число стикеров вместе со снимками избранного
 */
export const exportLibrary = async (
  options: ExportOptions = {}
): Promise<LibraryExport> => {
  const { packId, now = new Date(), onProgress } = options;
  const isLibrary = packId === undefined;
  const [packs, lists] = await Promise.all([loadPacks(packId), loadLists(isLibrary)]);
  const sections = buildSections(packs, lists);
  const total = checkLimits(packs, sections, isLibrary);
  const { manifest, entries } = buildManifest(packs, sections, isLibrary);
  const text = JSON.stringify(manifest);

  checkManifest(text, isLibrary);
  onProgress?.({ done: 0, total });
  const manifestEntry = {
    name: MANIFEST_FILE,
    data: new Blob([text], { type: 'application/json' }),
  };
  let blob: Blob;

  try {
    blob = await writeZip([manifestEntry, ...entries], {
      modified: now,
      onEntry: (written) => {
        /**
         * Первая запись — описание, стикеры идут за ним.
         */
        if (written > 1) onProgress?.({ done: written - 1, total });
      },
    });
  } catch (error) {
    if (error instanceof ZipError && error.kind === 'tooLarge') {
      throw tooBigError(isLibrary);
    }

    throw error;
  }

  const firstPack = packs[0];
  const fileName =
    isLibrary || !firstPack ? libraryFileName(now) : packFileName(firstPack.pack);

  return { blob, fileName, stickerCount: total };
};
