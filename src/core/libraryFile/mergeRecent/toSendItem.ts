import type { SendItem } from '@core/db.types';
import type { ManifestFavorite, ManifestRecent } from '@core/libraryFile';

/**
 * Элемент раздела как элемент библиотеки: по нему `itemKey` даёт тот же ключ, что у избранного и недавних базы.
 *
 * @param item — элемент избранного или недавних
 * @returns стикер библиотеки или GIF из поиска
 */
export const toSendItem = (item: ManifestFavorite | ManifestRecent): SendItem => {
  switch (item.kind) {
    case 'sticker': {
      return { kind: 'local', stickerId: item.id };
    }

    case 'gif': {
      return { kind: 'remote', gif: item.gif };
    }

    default: {
      throw new Error(`Неизвестный вид элемента: ${String(item satisfies never)}`);
    }
  }
};
