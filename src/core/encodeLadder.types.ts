/**
 * Готовый GIF одного полного прохода.
 */
export type EncodedPass = {
  /**
   * Байты GIF.
   */
  bytes: Uint8Array<ArrayBuffer>;

  /**
   * Ширина GIF в пикселях.
   */
  width: number;

  /**
   * Высота GIF в пикселях.
   */
  height: number;
};

export type EncodeLadderOptions = {
  /**
   * Число кадров плана источника.
   */
  frameCount: number;

  /**
   * Большая сторона источника, уже вписанная в 512 px.
   */
  side: number;

  /**
   * Пробный проход: кодирует кадры плана с данными номерами в стороне источника и отдаёт
   * вес потока в байтах.
   */
  sample: (indices: number[]) => Promise<number>;

  /**
   * Полный проход по источнику: кодирует все кадры плана с большей стороной `side`.
   */
  encode: (side: number) => Promise<EncodedPass>;

  /**
   * Отмена: следующий проход не запускается, наружу уходит `signal.reason`. undefined — без
   * отмены.
   */
  signal?: AbortSignal | undefined;
};
