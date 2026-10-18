/**
 * id кнопки ячейки ленты стикеров: по нему фокус находит соседнюю ячейку после удаления.
 * Пикер живёт в своём shadow root, и с id страницы amo они не пересекаются.
 *
 * Ключ ячейки уникален только в разделе — стикер пака и тот же стикер в недавних, — поэтому
 * в id входит и раздел.
 *
 * @param sectionId — раздел ячейки
 * @param key — ключ ячейки в разделе
 * @returns id кнопки ячейки
 */
export const cellId = (sectionId: string, key: string): string => {
  return `picker-sticker-cell-${sectionId}-${key}`;
};
