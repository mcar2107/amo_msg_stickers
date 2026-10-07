import { t } from './i18n/translate';
import {
  type CanvasBox,
  type Decorate,
  type GifResult,
  type SourceKind,
  type ToStickerGifOptions,
} from './convert.types';
import { encodeLadder } from './encodeLadder';
import type { EncodedPass } from './encodeLadder.types';
import { createFrameSink } from './frameSink';
import type { FrameSink } from './frameSink.types';
import { openFrameSource } from './frameSource';
import type { FrameSource } from './frameSource.types';
import { fit, planItem } from './frameSourceCommon';
import { MAX_GIF_BYTES } from './sidePick';

/**
 * amo отправляет PNG/WebP как JPEG с белым фоном, без изменений проходит только GIF.
 * Поэтому любой стикер/анимацию приводим к GIF с 1-битной прозрачностью.
 */

/**
 * Родной размер стикеров Telegram; меньше — мыло на Retina.
 */
export const STICKER_SIZE = 512;

/**
 * Пропорции подписи от высоты стикера: кегль, отступ базовой линии от низа,
 * толщина обводки от кегля и максимальная ширина строки от ширины стикера.
 */
const CAPTION_SIZE_RATIO = 0.13;
const CAPTION_BOTTOM_RATIO = 0.3;
const CAPTION_STROKE_RATIO = 1 / 5;
const CAPTION_MIN_STROKE = 2;
const CAPTION_MAX_WIDTH_RATIO = 0.94;

const makeCanvas = (w: number, h: number): CanvasBox => {
  const canvas = document.createElement('canvas');

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.imageSmoothingQuality = 'high';

  return { canvas, ctx };
};

/**
 * Прогоняет кадры плана через приёмник: кадр источника, поверх него подпись — уже в
 * размере холста, чтобы текст не мылился от даунскейла. Пиксели кадра уходят в приёмник
 * сразу, а следующий кадр захватывается, только когда `write` приёмника его пустил:
 * несжатых кадров в памяти не больше, чем приёмник держит в очереди кодирования (его
 * окно).
 *
 * Отмена проверяется перед каждым кадром: идущий кадр дописывается, следующий не
 * захватывается.
 *
 * @param source — открытый источник кадров
 * @param sink — приёмник прохода
 * @param box — холст в размере прохода
 * @param indices — номера кадров плана по порядку
 * @param decorate — дорисовка поверх кадра; undefined — без неё
 * @param signal — отмена; undefined — без неё
 */
const writeFrames = async (
  source: FrameSource,
  sink: FrameSink,
  { canvas, ctx }: CanvasBox,
  indices: Iterable<number>,
  decorate?: Decorate,
  signal?: AbortSignal
) => {
  const { width, height } = canvas;

  for (const index of indices) {
    signal?.throwIfAborted();
    await source.draw(index, ctx, width, height);
    decorate?.(ctx, width, height);
    await sink.write(
      ctx.getImageData(0, 0, width, height).data,
      planItem(source.plan, index).delayMs
    );
  }
};

/**
 * Каркас прохода: приёмник в размере прохода, кадры плана через него и `sink.close()` при
 * любом исходе — и когда упала запись кадров, и когда упал `collect`, и при отмене: Worker
 * кодирования останавливается, а не доигрывает проход.
 *
 * @param source — открытый источник кадров
 * @param size — ширина и высота прохода
 * @param indices — номера кадров плана по порядку
 * @param decorate — дорисовка поверх кадра; undefined — без неё
 * @param signal — отмена; undefined — без неё
 * @param collect — что забрать у приёмника после записи всех кадров
 * @returns результат `collect`
 */
const runPass = async <T>(
  source: FrameSource,
  [width, height]: [number, number],
  indices: Iterable<number>,
  decorate: Decorate | undefined,
  signal: AbortSignal | undefined,
  collect: (sink: FrameSink) => T | Promise<T>
): Promise<T> => {
  const sink = createFrameSink({ width, height, isAnimated: source.plan.length > 1 });

  try {
    await writeFrames(source, sink, makeCanvas(width, height), indices, decorate, signal);

    return await collect(sink);
  } finally {
    sink.close();
  }
};

/**
 * Пробный проход в размере источника: GIF не закрывается, нужен только вес потока.
 *
 * Вес читается после `flush`: `write` приёмника разрешается, пока последние кадры ещё
 * стоят в очереди кодирования, и `byteLength` без `flush` их не учёл бы — проба
 * занизила бы вес, и выбор стороны взял бы сторону крупнее допустимой.
 *
 * @param source — открытый источник кадров
 * @param indices — номера пробных кадров плана
 * @param decorate — дорисовка поверх кадра; undefined — без неё
 * @param signal — отмена; undefined — без неё
 * @returns вес пробы в байтах
 */
const samplePass = (
  source: FrameSource,
  indices: number[],
  decorate?: Decorate,
  signal?: AbortSignal
) => {
  return runPass(
    source,
    [source.width, source.height],
    indices,
    decorate,
    signal,
    async (sink) => {
      await sink.flush();

      return sink.byteLength;
    }
  );
};

/**
 * Полный проход по всему плану источника с большей стороной не больше `side`.
 *
 * @param source — открытый источник кадров
 * @param side — предел большей стороны прохода
 * @param decorate — дорисовка поверх кадра; undefined — без неё
 * @param signal — отмена; undefined — без неё
 * @returns готовый GIF прохода
 */
const fullPass = (
  source: FrameSource,
  side: number,
  decorate?: Decorate,
  signal?: AbortSignal
): Promise<EncodedPass> => {
  const [width, height] = fit(source.width, source.height, side);

  return runPass(
    source,
    [width, height],
    source.plan.keys(),
    decorate,
    signal,
    async (sink) => {
      return { bytes: await sink.finish(), width, height };
    }
  );
};

export const detectKind = (blob: Blob, fileName = ''): SourceKind => {
  const name = fileName.toLowerCase();

  if (name.endsWith('.tgs') || blob.type === 'application/x-tgsticker') return 'tgs';
  if (blob.type.startsWith('video/') || name.endsWith('.webm') || name.endsWith('.mp4'))
    return 'video';

  return 'image';
};

export const toStickerGif = async (
  blob: Blob,
  kind: SourceKind,
  opts: ToStickerGifOptions = {}
): Promise<GifResult> => {
  const { decorate, signal } = opts;
  const max = opts.max || STICKER_SIZE;

  signal?.throwIfAborted();

  if (
    kind === 'image' &&
    blob.type === 'image/gif' &&
    !decorate &&
    blob.size <= MAX_GIF_BYTES
  ) {
    const bitmap = await createImageBitmap(blob);
    const result = { blob, width: bitmap.width, height: bitmap.height };

    bitmap.close();

    return result;
  }

  const source = await openFrameSource(blob, kind, max);

  try {
    if (!source.plan.length) throw new Error(t('error.convert.noFrames'));

    const { bytes, width, height } = await encodeLadder({
      frameCount: source.plan.length,
      side: Math.max(source.width, source.height),
      sample: (indices) => {
        return samplePass(source, indices, decorate, signal);
      },
      encode: (side) => {
        return fullPass(source, side, decorate, signal);
      },
      signal,
    });

    return { blob: new Blob([bytes], { type: 'image/gif' }), width, height };
  } finally {
    source.dispose();
  }
};

/**
 * Подпись снизу стикера: белый текст с тёмной обводкой, как в мемах.
 */
export const captionDecorator = (text: string): Decorate => {
  return (ctx, w, h) => {
    const size = Math.round(h * CAPTION_SIZE_RATIO);

    ctx.save();
    ctx.font = `bold ${size}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(CAPTION_MIN_STROKE, size * CAPTION_STROKE_RATIO);
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    const x = w / 2;
    const y = h - size * CAPTION_BOTTOM_RATIO;
    const maxWidth = w * CAPTION_MAX_WIDTH_RATIO;

    ctx.strokeText(text, x, y, maxWidth);
    ctx.fillText(text, x, y, maxWidth);
    ctx.restore();
  };
};
