import type { DraftSize, StickerDraft } from './useStickerDraft.types';

const BYTES_IN_KB = 1024;

/**
 * Размер готового стикера для подписи в футере: стороны в пикселях и вес в КБ, округлённый
 * до целого.
 *
 * @param draft — черновик; `null` — стикер ещё не собран или сборка не удалась
 * @returns размер или `null`, если стикера нет
 */
export const draftSize = (draft: StickerDraft | null): DraftSize | null => {
  if (!draft) return null;
  const {
    gif: { blob, width, height },
  } = draft;

  return { width, height, kb: Math.round(blob.size / BYTES_IN_KB) };
};
