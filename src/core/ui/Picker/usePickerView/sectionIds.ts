/**
 * Раздел недавних стикеров в ленте. У разделов паков id — id пака, а `recent` с ним не
 * совпадёт: id паков — `custom` и `tg:<имя>`.
 */
export const RECENT_SECTION_ID = 'recent';

/**
 * Раздел избранных стикеров в ленте — первый, выше недавних. С id паков не совпадёт по той же
 * причине, что `recent`.
 */
export const FAVORITE_SECTION_ID = 'favorite';
