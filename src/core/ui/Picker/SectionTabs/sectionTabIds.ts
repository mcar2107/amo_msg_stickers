/**
 * id ленты стикеров — для `aria-controls` вкладок разделов: все они прокручивают одну ленту.
 */
export const FEED_PANEL_ID = 'picker-sticker-feed';

/**
 * id вкладки раздела — для `aria-labelledby` ленты. Пикер живёт в своём shadow root, и с id
 * страницы amo они не пересекаются.
 *
 * @param sectionId — раздел: id пака (`custom`, `tg:<имя>`), `recent` или `favorite`
 * @returns id вкладки раздела
 */
export const sectionTabId = (sectionId: string): string => {
  return `picker-section-tab-${sectionId}`;
};
