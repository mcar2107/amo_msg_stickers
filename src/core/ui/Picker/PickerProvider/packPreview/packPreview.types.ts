import type { TgStickerSet } from '../../../../sources/telegram.types';

/**
 * Запрос набора пака у Bot API по имени.
 */
export type ResolveSet = (name: string) => Promise<TgStickerSet>;

export type PackPreview = {
  /**
   * Набор пака: уже полученный или идущий запрос того же имени, иначе новый запрос. Превью
   * и импорт берут набор отсюда, и `getStickerSet` уходит один раз на имя.
   */
  load: (name: string, resolve: ResolveSet) => Promise<TgStickerSet>;

  /**
   * Номер нового запроса превью; все выданные раньше устаревают.
   */
  begin: () => number;

  /**
   * `true` — номер последний, и ответ по нему ещё можно показывать.
   */
  isCurrent: (request: number) => boolean;
};
