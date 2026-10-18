import type { FramePlanItem, FrameSource } from './frameSource.types';
import { fit, MAX_DURATION_SEC, MAX_FRAMES, planItem } from './frameSourceCommon';
import { t } from './i18n';

const MAX_DURATION_MS = MAX_DURATION_SEC * 1000;

/**
 * Задержка кадра, если декодер её не сообщил, и нижняя граница: задержку в 0–1
 * сотую браузеры заменяют на 100 мс, и анимация резко замедлилась бы.
 */
const DEFAULT_FRAME_DELAY_MS = 100;
const MIN_FRAME_DELAY_MS = 20;

/**
 * Задержка кадра анимированной картинки.
 *
 * @param durationUs — `VideoFrame.duration` в микросекундах; null или 0 — декодер не сообщил
 * @returns задержка в мс, не меньше 20
 */
export const frameDelayMs = (durationUs: number | null) => {
  return durationUs
    ? Math.max(MIN_FRAME_DELAY_MS, durationUs / 1000)
    : DEFAULT_FRAME_DELAY_MS;
};

/**
 * Источник через `ImageDecoder`. Длительности кадров декодер сообщает только в самих
 * кадрах, поэтому план строится декодированием каждого кадра с немедленным `close`: в
 * памяти остаётся не больше одного кадра. В план идут не больше 100 кадров, начавшихся
 * раньше 4 с по сумме задержек; дальше кадры не декодируются. Задержка кадра, который
 * выходит за 4 с, урезается до конца 4 с, но не ниже 20 мс: длинный последний кадр
 * иначе растянул бы GIF далеко за предел. Единственный кадр — статичная картинка, его
 * задержка 0.
 *
 * @param blob — файл картинки с поддерживаемым `ImageDecoder` типом
 * @param maxSide — предел большей стороны
 * @returns источник кадров; декодер живёт до `dispose`
 */
const openDecodedImage = async (blob: Blob, maxSide: number): Promise<FrameSource> => {
  const decoder = new ImageDecoder({ data: blob.stream(), type: blob.type });
  const plan: FramePlanItem[] = [];
  let size: [number, number] = [1, 1];

  try {
    await decoder.tracks.ready;
    await decoder.completed;
    const track = decoder.tracks.selectedTrack;

    if (!track) throw new Error(t('error.convert.noImageTrack'));

    const count = Math.min(track.frameCount, MAX_FRAMES);
    let startMs = 0;

    for (let index = 0; index < count && startMs < MAX_DURATION_MS; index++) {
      const { image } = await decoder.decode({ frameIndex: index });
      const delayMs =
        count > 1
          ? Math.min(
              frameDelayMs(image.duration),
              Math.max(MIN_FRAME_DELAY_MS, MAX_DURATION_MS - startMs)
            )
          : 0;

      if (!index) size = fit(image.displayWidth, image.displayHeight, maxSide);
      plan.push({ position: index, delayMs });
      startMs += delayMs;
      image.close();
    }
  } catch (error) {
    decoder.close();
    throw error;
  }

  const [width, height] = size;

  return {
    width,
    height,
    plan,
    draw: async (index, ctx, w, h) => {
      const { image } = await decoder.decode({
        frameIndex: planItem(plan, index).position,
      });

      try {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(image, 0, 0, w, h);
      } finally {
        image.close();
      }
    },
    dispose: () => {
      decoder.close();
    },
  };
};

/**
 * Источник через `createImageBitmap`: один статичный кадр, битмап живёт до `dispose`.
 *
 * @param blob — файл картинки
 * @param maxSide — предел большей стороны
 * @returns источник из одного кадра с задержкой 0
 */
const openBitmapImage = async (blob: Blob, maxSide: number): Promise<FrameSource> => {
  const bitmap = await createImageBitmap(blob);
  const [width, height] = fit(bitmap.width, bitmap.height, maxSide);
  const plan: FramePlanItem[] = [{ position: 0, delayMs: 0 }];

  return {
    width,
    height,
    plan,
    draw: async (index, ctx, w, h) => {
      planItem(plan, index);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
    },
    dispose: () => {
      bitmap.close();
    },
  };
};

/**
 * Открывает картинку как источник кадров: анимированную — через `ImageDecoder`, если
 * браузер его знает и поддерживает тип файла, иначе первым кадром через `createImageBitmap`.
 *
 * @param blob — файл картинки
 * @param maxSide — предел большей стороны
 * @returns источник кадров картинки
 */
export const openImageSource = async (blob: Blob, maxSide: number) => {
  if (
    typeof ImageDecoder !== 'undefined' &&
    blob.type &&
    (await ImageDecoder.isTypeSupported(blob.type))
  ) {
    return openDecodedImage(blob, maxSide);
  }

  return openBitmapImage(blob, maxSide);
};
