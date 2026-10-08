import type { RemoteGif } from '../../../db.types';

/**
 * Ключ GIF в разделе ленты: id уникален только у своего провайдера.
 *
 * @param gif — GIF из поиска
 * @returns ключ GIF
 */
export const gifKey = (gif: RemoteGif): string => {
  const { provider, id } = gif;

  return `${provider}:${id}`;
};

/**
 * id кнопки ячейки GIF: по нему фокус находит соседнюю недавнюю GIF после «Убрать из недавних»,
 * а закреплённый предпросмотр — ячейку, на которую переключился стрелкой. Ключ GIF уникален
 * только в разделе — та же GIF стоит и в недавних, и в выдаче, — а id в shadow root пикера
 * не должны повторяться, поэтому в id входит и раздел.
 *
 * @param sectionId — раздел ячейки
 * @param key — ключ GIF из `gifKey`
 * @returns id кнопки ячейки
 */
export const gifCellId = (sectionId: string, key: string): string => {
  return `picker-gif-cell-${sectionId}-${key}`;
};

/**
 * id кнопки ячейки GIF по разделу и самой GIF: им ячейку подписывает лента и по нему же её
 * находит шаг закреплённого предпросмотра.
 *
 * @param sectionId — раздел ячейки
 * @param gif — GIF ячейки
 * @returns id кнопки ячейки
 */
export const gifItemCellId = (sectionId: string, gif: RemoteGif): string => {
  return gifCellId(sectionId, gifKey(gif));
};
