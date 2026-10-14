/**
 * Вид отправленного файла: стикер из пака (своего или из Telegram) или GIF из поиска.
 */
export type StickerKind = 'sticker' | 'gif';

export type StickerNameParts = {
  /**
   * Метка перед маркером. Пустая строка — метки нет.
   */
  label: string;

  /**
   * Параметры `ключ → значение` между маркером и расширением, включая вид `k`; при повторе ключа — первое вхождение.
   */
  params: Record<string, string>;
};
