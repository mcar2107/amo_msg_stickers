import type {
  DraftSize,
  SaveBlock,
} from '../../../useStickerDraft/useStickerDraft.types';

export type CreateStickerFooterProps = {
  /**
   * Сохранение недоступно: стикера ещё нет, он пересобирается или уже сохраняется.
   * Недоступная кнопка не даёт и отправить форму Enter-ом.
   */
  isDisabled: boolean;

  /**
   * Причина недоступности, которую стоит написать рядом с кнопкой; `null` — без текста.
   */
  saveBlock: SaveBlock;

  /**
   * Размер готового стикера: пишется на месте причины, когда пояснять нечего; `null` —
   * стикера нет.
   */
  size: DraftSize | null;
};
