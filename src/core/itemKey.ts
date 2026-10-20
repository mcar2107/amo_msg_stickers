import type { FavoriteRec, RecentKind, SendItem, StickerRec } from './db.types';

/**
 * Id «Моих стикеров». Живёт здесь, а не в базе: его берёт и разбор файла выгрузки, который база сама импортирует.
 */
export const CUSTOM_PACK_ID = 'custom';

/**
 * Недавних каждого вида. Его же держит файл выгрузки: в файле нет недавних, которых библиотека не показала бы.
 */
export const RECENT_LIMIT = 40;

/**
 * Начало ключа стикера библиотеки у недавних и избранного.
 */
export const LOCAL_KEY_PREFIX = 'l:';

/**
 * Начало ключа GIF из поиска у недавних и избранного: за ним — источник и id GIF.
 */
export const REMOTE_KEY_PREFIX = 'r:';

/**
 * Один ключ на элемент у недавних и избранного: «в избранном ли» узнаётся у любой ячейки по её элементу.
 *
 * @param item — элемент
 * @returns `l:<id стикера>` у стикера библиотеки, `r:<источник>:<id>` у GIF из поиска
 */
export const itemKey = (item: SendItem): string => {
  switch (item.kind) {
    case 'local': {
      return `${LOCAL_KEY_PREFIX}${item.stickerId}`;
    }

    case 'remote': {
      return `${REMOTE_KEY_PREFIX}${item.gif.provider}:${item.gif.id}`;
    }

    default: {
      const unknownItem: never = item;

      throw new Error(`Unknown send item: ${JSON.stringify(unknownItem)}`);
    }
  }
};

/**
 * Вид выводится из самого элемента, а не хранится отдельным полем: записи, сохранённые до
 * разделения недавних, попадают каждая в свой вид без миграции базы.
 *
 * @param item — отправленный элемент
 * @returns вид недавних
 */
export const recentKindOf = (item: SendItem): RecentKind => {
  switch (item.kind) {
    case 'local': {
      return 'sticker';
    }

    case 'remote': {
      return 'gif';
    }

    default: {
      const unknownItem: never = item;

      throw new Error(`Unknown send item: ${JSON.stringify(unknownItem)}`);
    }
  }
};

/**
 * Одна сборка записи избранного и для отметки в пикере, и для импорта из файла: здесь, а не в базе, потому что импорт
 * строит записи без импорта базы.
 *
 * @param item — элемент
 * @param sticker — снимок записи стикера; обязателен у стикера библиотеки
 * @param ts — время добавления (мс)
 * @returns запись избранного
 */
export const favoriteRecord = (
  item: SendItem,
  sticker: StickerRec | undefined,
  ts: number
): FavoriteRec => {
  const key = itemKey(item);

  switch (item.kind) {
    case 'local': {
      if (!sticker) throw new Error(`Favorite sticker without snapshot: ${key}`);

      return { key, ts, item, sticker };
    }

    case 'remote': {
      return { key, ts, item };
    }

    default: {
      const unknownItem: never = item;

      throw new Error(`Unknown send item: ${JSON.stringify(unknownItem)}`);
    }
  }
};
