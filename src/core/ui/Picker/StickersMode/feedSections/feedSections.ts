import { CUSTOM_PACK_ID } from '../../../../db';
import type { Pack, RecentRec, StickerRec, StickersByPack } from '../../../../db.types';
import { t } from '../../../../i18n/translate';
import { packTitle } from '../../../../packTitle';
import { stickerCellName } from '../../cellName/cellName';
import { RECENT_SECTION_ID } from '../../usePickerView/sectionIds';

import type { FeedSection, FeedSticker } from './feedSections.types';

/**
 * Ячейка стикера.
 *
 * @param key — ключ ячейки в разделе
 * @param sticker — запись стикера
 * @returns стикер ленты
 */
const feedSticker = (key: string, sticker: StickerRec): FeedSticker => {
  const { id } = sticker;

  return {
    key,
    item: { kind: 'local', stickerId: id },
    sticker,
    name: stickerCellName(sticker),
  };
};

/**
 * Стикеры недавних в порядке записей. Запись, чей стикер удалён из библиотеки, не показывается, а
 * записи GIF сюда не попадают: у них своя лента.
 *
 * @param recent — записи недавних стикеров, от новых к старым
 * @param byPack — стикеры библиотеки по пакам
 * @returns ячейки раздела «Недавние»
 */
const recentStickers = (recent: RecentRec[], byPack: StickersByPack): FeedSticker[] => {
  const byId = new Map<string, StickerRec>();

  for (const stickers of byPack.values()) {
    for (const sticker of stickers) byId.set(sticker.id, sticker);
  }

  return recent.reduce<FeedSticker[]>((acc, { key, item }) => {
    const sticker = item.kind === 'local' ? byId.get(item.stickerId) : undefined;

    if (sticker) acc.push(feedSticker(key, sticker));

    return acc;
  }, []);
};

/**
 * Разделы ленты стикеров: «Недавние», если в них есть живые стикеры, затем паки в порядке списка —
 * «Мои стикеры» в нём первые и заканчиваются плиткой «Создать стикер». Другой пак без стикеров остаётся
 * разделом с подсказкой.
 *
 * @param packs — паки библиотеки в порядке вкладок
 * @param byPack — стикеры по пакам в порядке добавления; пака без стикеров в нём нет
 * @param recent — записи недавних стикеров, от новых к старым
 * @returns разделы в порядке ленты
 */
export const feedSections = (
  packs: Pack[],
  byPack: StickersByPack,
  recent: RecentRec[]
): FeedSection[] => {
  const sections: FeedSection[] = [];
  const recentItems = recentStickers(recent, byPack);

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
