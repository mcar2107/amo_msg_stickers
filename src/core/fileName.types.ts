import type { StickerKind } from '../shared/stickerMark.types';

import type { StickerRec } from './db.types';

/**
 * Вид отправленного файла — тот же, что у пометки строки ленты.
 */
export type StickerFileKind = StickerKind;

export type StickerFileNameParams = {
  /**
   * Вид файла, пишется в имя параметром `k`.
   */
  kind: StickerFileKind;

  /**
   * Метка для людей: эмодзи, подпись или название GIF. Пустая после вычистки — имя начинается с маркера.
   */
  label: string;

  /**
   * Дополнительные параметры `ключ → значение`: только `[a-z0-9]`, ключ с буквы и не `k`. Нет — только вид.
   */
  params?: Record<string, string> | undefined;
};

export type ParsedStickerFileName = {
  /**
   * Вид из параметра `k`. null — параметра нет или вид незнакомый: имя всё равно остаётся именем amo stickers.
   */
  kind: StickerFileKind | null;

  /**
   * Метка перед маркером. Пустая строка — метки нет.
   */
  label: string;

  /**
   * Параметры `ключ → значение` кроме `k`, в том числе незнакомые; при повторе ключа — первое вхождение.
   */
  params: Record<string, string>;
};

/**
 * Поля записи стикера, из которых строится метка имени файла.
 */
export type StickerLabelSource = Pick<StickerRec, 'caption' | 'emoji'>;
