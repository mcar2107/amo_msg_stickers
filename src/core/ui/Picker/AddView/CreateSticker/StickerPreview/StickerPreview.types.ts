export type StickerPreviewProps = {
  /**
   * Object URL готового GIF; `null` — первая сборка ещё идёт, превью нет.
   */
  url: string | null;

  /**
   * Стикер собирается: поверх превью или на его месте — индикатор сборки.
   */
  isBusy: boolean;
};
