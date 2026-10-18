import type { StickerRow } from '@ui/stickerLayout';

export type FeedWindowRangesOptions<T> = {
  /**
   * Ряды раскладки ленты.
   */
  rows: StickerRow<T>[];

  /**
   * Текущая прокрутка ленты, в пикселях.
   */
  scrollTop: number;

  /**
   * Высота видимой области ленты, в пикселях; она же — запас рядов за её краем.
   */
  viewport: number;

  /**
   * Цель плавного доезда, в пикселях; `null` — лента не едет.
   */
  glideTo: number | null;

  /**
   * Прокрутка, на которую лента встанет мгновенным переходом перед доездом, в пикселях; `null` —
   * перехода нет.
   */
  jumpTo: number | null;
};
