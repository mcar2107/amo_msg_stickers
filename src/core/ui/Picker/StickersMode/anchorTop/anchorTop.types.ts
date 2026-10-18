import type { StickerLayout } from '@ui/stickerLayout';
import type { SectionAnchor } from '@ui/usePickerView';

export type AnchorTopOptions<T> = {
  /**
   * Последний запрос прокрутки к разделу; `null` — запросов не было.
   */
  anchor: SectionAnchor | null;

  /**
   * Номер последнего исполненного запроса.
   */
  appliedSeq: number;

  /**
   * Раскладка ленты; `null` — ширина ленты ещё не известна.
   */
  layout: StickerLayout<T> | null;

  /**
   * Разделы раскладки прочитаны для текущего списка паков. Ложь — лента ещё показывает прежнее
   * чтение, и место раздела в ней может быть не тем, что после перечитывания.
   */
  isCurrent: boolean;
};
