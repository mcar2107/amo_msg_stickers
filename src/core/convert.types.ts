export type GifResult = {
  /**
   * Готовая GIF.
   */
  blob: Blob;

  /**
   * Ширина GIF в пикселях.
   */
  width: number;

  /**
   * Высота GIF в пикселях.
   */
  height: number;
};

export type Decorate = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export type ToStickerGifOptions = {
  /**
   * Максимальная сторона результата в пикселях. По умолчанию — `STICKER_SIZE`.
   */
  max?: number;

  /**
   * Дорисовка поверх каждого кадра (например, подпись). undefined — без дорисовки.
   */
  decorate?: Decorate | undefined;

  /**
   * Отмена конвертации: проход обрывается перед следующим кадром, приёмник и источник
   * закрываются, а наружу уходит `signal.reason`. undefined — без отмены.
   */
  signal?: AbortSignal | undefined;
};

export type SourceKind = 'tgs' | 'video' | 'image';

export type CanvasBox = {
  /**
   * Холст, на котором рисуется кадр.
   */
  canvas: HTMLCanvasElement;

  /**
   * 2d-контекст холста с `willReadFrequently`: из него постоянно читаются пиксели.
   */
  ctx: CanvasRenderingContext2D;
};

/**
 * Поля Lottie JSON, нужные для раскадровки.
 */
export type LottieJson = {
  /**
   * Ширина композиции в пикселях.
   */
  w: number;

  /**
   * Высота композиции в пикселях.
   */
  h: number;

  /**
   * Исходная частота кадров. Нет — считаем 60.
   */
  fr?: number;

  /**
   * Первый кадр анимации.
   */
  ip: number;

  /**
   * Кадр, на котором анимация заканчивается; больше `ip`.
   */
  op: number;

  /**
   * Слои композиции; содержимое разбирает lottie-web.
   */
  layers: unknown[];
};

/**
 * Границы отсекают файлы, на которых рендер заведомо бессмыслен или неподъёмен: холст
 * больше 4096 px и частоту выше 120 fps стикеры Telegram не используют.
 */
const MAX_LOTTIE_SIDE = 4096;
const MAX_LOTTIE_FPS = 120;

const isInRange = (value: unknown, max: number) => {
  return typeof value === 'number' && value > 0 && value <= max;
};

export const isLottieJson = (value: unknown): value is LottieJson => {
  return (
    !!value &&
    typeof value === 'object' &&
    'w' in value &&
    isInRange(value.w, MAX_LOTTIE_SIDE) &&
    'h' in value &&
    isInRange(value.h, MAX_LOTTIE_SIDE) &&
    (!('fr' in value) || isInRange(value.fr, MAX_LOTTIE_FPS)) &&
    'ip' in value &&
    typeof value.ip === 'number' &&
    'op' in value &&
    typeof value.op === 'number' &&
    value.op > value.ip &&
    'layers' in value &&
    Array.isArray(value.layers)
  );
};
