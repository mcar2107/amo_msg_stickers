import type { DraftConvertingInput } from './useStickerDraft.types';

/**
 * Стикер собирается не только пока кодируется GIF, но и пока введённая подпись расходится с
 * той, по которой он собран или собирается: в окне задержки ввода сохранение записало бы
 * стикер с прежней подписью, а пользователь видит в поле уже новую.
 *
 * @param input — выбран ли файл, подпись в поле, подпись сборки и идёт ли кодирование
 * @returns стикер собирается, сохранять его рано
 */
export const isDraftConverting = (input: DraftConvertingInput): boolean => {
  const { hasFile, caption, drawnCaption, isEncoding } = input;

  if (!hasFile) return false;

  return isEncoding || caption.trim() !== drawnCaption;
};
