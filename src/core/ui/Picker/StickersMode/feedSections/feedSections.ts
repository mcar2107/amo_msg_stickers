import { CUSTOM_PACK_ID, itemKey } from '../../../../db';
import type {
  FavoriteRec,
  Pack,
  RecentRec,
  StickerRec,
  StickersByPack,
} from '../../../../db.types';
import { t } from '../../../../i18n/translate';
import { stickerCellName } from '../../cellName/cellName';
import { packTitle } from '../../packTitle/packTitle';
import { FAVORITE_SECTION_ID, RECENT_SECTION_ID } from '../../usePickerView/sectionIds';

import type { FeedSection, FeedSticker } from './feedSections.types';

/**
 * Сколько недавних стикеров показывает раздел «Недавние». Записанных недавних больше (`RECENT_LIMIT`
 * в `db.ts`): избранные в разделе не показываются, и их место занимают следующие по свежести.
 */
const RECENT_STICKERS_SHOWN = 14;

/**
 * Префикс ключа Object URL снимка избранного: у снимка свой URL, а не URL стикера библиотеки по id.
 */
const SNAPSHOT_URL_PREFIX = 'fav:';

/**
 * Ячейка стикера.
 *
 * @param key — ключ ячейки в разделе
 * @param sticker — запись стикера
 * @param urlKey — ключ Object URL картинки
 * @returns стикер ленты
 */
const feedSticker = (
  key: string,
  sticker: StickerRec,
  urlKey = sticker.id
): FeedSticker => {
  const { id } = sticker;

  return {
    key,
    item: { kind: 'local', stickerId: id },
    sticker,
    urlKey,
    name: stickerCellName(sticker),
  };
};

/**
 * Стикеры библиотеки по id.
 *
 * @param byPack — стикеры библиотеки по пакам
 * @returns запись стикера по его id
 */
const stickersById = (byPack: StickersByPack): Map<string, StickerRec> => {
  const byId = new Map<string, StickerRec>();

  for (const stickers of byPack.values()) {
    for (const sticker of stickers) byId.set(sticker.id, sticker);
  }

  return byId;
};

/**
 * Стикеры избранного в порядке записей. Стикер, который есть в библиотеке, берётся из неё — картинка и
 * URL общие с ячейкой пака; удалённый из библиотеки показывается снимком. GIF сюда не попадают: у них
 * своя лента.
 *
 * @param favorites — записи избранного, от новых к старым
 * @param byId — стикеры библиотеки по id
 * @returns ячейки раздела «Избранное»
 */
const favoriteStickers = (
  favorites: FavoriteRec[],
  byId: Map<string, StickerRec>
): FeedSticker[] => {
  return favorites.reduce<FeedSticker[]>((acc, record) => {
    if (!('sticker' in record)) return acc;

    const { key, sticker: snapshot } = record;
    const library = byId.get(snapshot.id);

    acc.push(
      library
        ? feedSticker(key, library)
        : feedSticker(key, snapshot, `${SNAPSHOT_URL_PREFIX}${snapshot.id}`)
    );

    return acc;
  }, []);
};

/**
 * Стикеры недавних в порядке записей, не больше `RECENT_STICKERS_SHOWN`. Запись, чей стикер удалён из
 * библиотеки или есть в избранном, не показывается и места не занимает, а записи GIF сюда не попадают:
 * у них своя лента.
 *
 * @param recent — записи недавних стикеров, от новых к старым
 * @param byId — стикеры библиотеки по id
 * @param favoriteKeys — ключи записей избранного
 * @returns ячейки раздела «Недавние»
 */
const recentStickers = (
  recent: RecentRec[],
  byId: Map<string, StickerRec>,
  favoriteKeys: Set<string>
): FeedSticker[] => {
  const items: FeedSticker[] = [];

  for (const { key, item } of recent) {
    if (items.length >= RECENT_STICKERS_SHOWN) break;

    const sticker = item.kind === 'local' ? byId.get(item.stickerId) : undefined;

    if (sticker && !favoriteKeys.has(itemKey(item))) {
      items.push(feedSticker(key, sticker));
    }
  }

  return items;
};

/**
 * Разделы ленты стикеров: «Избранное», если в нём есть стикеры, «Недавние», если в них есть живые
 * стикеры не из избранного, затем паки в порядке списка —
 * «Мои стикеры» в нём первые и заканчиваются плиткой «Создать стикер». Другой пак без стикеров остаётся
 * разделом с подсказкой.
 *
 * @param packs — паки библиотеки в порядке вкладок
 * @param byPack — стикеры по пакам в порядке добавления; пака без стикеров в нём нет
 * @param recent — записи недавних стикеров, от новых к старым
 * @param favorites — записи избранного, от новых к старым
 * @returns разделы в порядке ленты
 */
export const feedSections = (
  packs: Pack[],
  byPack: StickersByPack,
  recent: RecentRec[],
  favorites: FavoriteRec[]
): FeedSection[] => {
  const sections: FeedSection[] = [];
  const byId = stickersById(byPack);
  const favoriteItems = favoriteStickers(favorites, byId);
  const favoriteKeys = new Set(
    favorites.map(({ key }) => {
      return key;
    })
  );
  const recentItems = recentStickers(recent, byId, favoriteKeys);

  if (favoriteItems.length) {
    sections.push({
      id: FAVORITE_SECTION_ID,
      title: t('stickers.favorites'),
      pack: null,
      items: favoriteItems,
      hasCreateTile: false,
      hint: '',
    });
  }

  if (recentItems.length) {
    sections.push({
      id: RECENT_SECTION_ID,
      title: t('stickers.recent'),
      pack: null,
      items: recentItems,
      hasCreateTile: false,
      hint: '',
    });
  }

  for (const pack of packs) {
    const { id } = pack;
    const stickers = byPack.get(id) || [];
    const isCustom = id === CUSTOM_PACK_ID;

    sections.push({
      id,
      title: packTitle(pack),
      pack,
      items: stickers.map((sticker) => {
        return feedSticker(sticker.id, sticker);
      }),
      hasCreateTile: isCustom,
      hint: isCustom ? '' : t('stickers.packEmpty'),
    });
  }

  return sections;
};
