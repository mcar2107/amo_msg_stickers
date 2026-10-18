import type { Pack, RecentRec, SendItem, StickersByPack } from '../../../../db.types';
import type { FeedSection } from '../feedSections/feedSections.types';

export type FeedSections = {
  /**
   * Разделы ленты в порядке показа; `null` — библиотека или избранное ещё не прочитаны.
   */
  sections: FeedSection[] | null;

  /**
   * Разделы прочитаны для текущего списка паков. Ложь — после `refreshPacks` лента ещё
   * показывает прежнее чтение: место раздела в ней может сдвинуться после перечитывания.
   */
  isCurrent: boolean;

  /**
   * Удаляет стикер из библиотеки. Промис не отклоняется: ошибка уходит в статус.
   */
  removeSticker: (stickerId: string) => Promise<void>;

  /**
   * Убирает элемент из недавних. Промис не отклоняется: ошибка уходит в статус.
   */
  removeRecent: (item: SendItem) => Promise<void>;

  /**
   * Удаляет пак со всеми стикерами. Промис не отклоняется: ошибка уходит в статус.
   */
  removePack: (packId: string) => Promise<void>;

  /**
   * Очищает недавние стикеры, недавние GIF не трогает. Промис не отклоняется: ошибка уходит в
   * статус.
   */
  clearRecentStickers: () => Promise<void>;
};

/**
 * Одно чтение библиотеки.
 */
export type FeedRead = {
  /**
   * Стикеры библиотеки по пакам.
   */
  byPack: StickersByPack;

  /**
   * Записи недавних стикеров, от новых к старым.
   */
  recent: RecentRec[];

  /**
   * Список паков, для которого прочитаны разделы.
   */
  packs: Pack[];
};
