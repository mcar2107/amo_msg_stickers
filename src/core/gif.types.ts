export type GifSize = {
  /**
   * Ширина логического экрана GIF в пикселях, больше нуля.
   */
  width: number;

  /**
   * Высота логического экрана GIF в пикселях, больше нуля.
   */
  height: number;
};

export type GifInfo = GifSize & {
  /**
   * Сколько целых кадров удалось прочитать.
   */
  frames: number;
};
