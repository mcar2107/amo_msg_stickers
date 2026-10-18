import type { Pack } from './db.types';
import { SET_NAME_RE } from './sources';

/**
 * Начало ссылки на набор стикеров в Telegram: к нему дописывается имя набора.
 */
const TG_STICKERS_LINK_PREFIX = 'https://t.me/addstickers/';

/**
 * Ссылка на пак в Telegram — та же, по которой пак импортируется.
 *
 * Имя набора в ссылку идёт как есть, без кодирования: оно `[A-Za-z0-9_]`, и эта же проверка
 * стоит на импорте, так что запись в базе с другим именем не даст ссылку.
 *
 * @param pack — пак библиотеки
 * @returns ссылка; `null` — у пака её нет: свои стикеры или нет имени набора
 */
export const packLink = (pack: Pick<Pack, 'source' | 'sourceRef'>): string | null => {
  const { source, sourceRef } = pack;

  if (source !== 'telegram' || !sourceRef || !SET_NAME_RE.test(sourceRef)) return null;

  return `${TG_STICKERS_LINK_PREFIX}${sourceRef}`;
};
