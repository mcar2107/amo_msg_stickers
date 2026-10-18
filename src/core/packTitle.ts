import { t } from './i18n/translate';
import { CUSTOM_PACK_ID } from './db';
import type { Pack } from './db.types';

/**
 * Название пака для показа. Свой пак называется на языке интерфейса по id, а не по записи: `title` в
 * записи — на языке, при котором пак создан, и переписывать его при каждой смене языка значило бы
 * писать в базу ради подписи. Название пака Telegram — данные пользователя, оно не переводится.
 *
 * @param pack — id и название из записи пака
 * @returns название вкладки, заголовка, обложки и подписей пака
 */
export const packTitle = (pack: Pick<Pack, 'id' | 'title'>): string => {
  const { id, title } = pack;

  return id === CUSTOM_PACK_ID ? t('pack.custom') : title;
};
