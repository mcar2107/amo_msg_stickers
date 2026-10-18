import type { FramePlanItem } from './frameSource.types';
import { t } from './i18n';

export const MAX_FRAMES = 100;
export const MAX_DURATION_SEC = 4;

/**
 * 40 мс = ровно 4 сотых: у GIF задержка в сотых, дробные fps «плывут» по скорости.
 */
export const ANIMATION_FPS = 25;
export const EVENT_TIMEOUT_MS = 10_000;

/**
 * Вписывает размер в квадрат `max` с сохранением пропорций; мелкий источник не увеличивается.
 *
 * @param w — ширина источника
 * @param h — высота источника
 * @param max — предел большей стороны
 * @returns ширина и высота, не меньше 1 px каждая
 */
export const fit = (w: number, h: number, max: number): [number, number] => {
  const k = Math.min(1, max / Math.max(w, h));

  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
};

/**
 * Кадр плана по индексу для `draw` источника.
 *
 * @param plan — план кадров источника
 * @param index — индекс кадра
 * @returns кадр плана; индекс вне плана — `RangeError`
 */
export const planItem = (plan: FramePlanItem[], index: number) => {
  const item = plan[index];

  if (!item) throw new RangeError(`frame ${index} is out of plan (${plan.length})`);

  return item;
};

/**
 * Равномерный план кадров: позиции `positionAt(index)` подряд, не дальше длины источника и
 * 4 с его времени и не больше 100 кадров. Позицию считает вызывающий: у каждого источника
 * своя единица и своя формула, которая не копит ошибку дробного шага.
 *
 * @param length — длина источника в единицах позиции
 * @param unitsPerSec — единиц позиции в секунде источника
 * @param delayMs — задержка каждого кадра в мс
 * @param positionAt — позиция кадра плана по его номеру
 * @returns план кадров
 */
export const evenPlan = (
  length: number,
  unitsPerSec: number,
  delayMs: number,
  positionAt: (index: number) => number
) => {
  const end = Math.min(length, unitsPerSec * MAX_DURATION_SEC);
  const plan: FramePlanItem[] = [];

  for (let index = 0; index < MAX_FRAMES && positionAt(index) < end; index++) {
    plan.push({ position: positionAt(index), delayMs });
  }

  return plan;
};

/**
 * Ждёт событие элемента. Отклоняется сразу по его событию `error` (битый файл не ждёт
 * таймаута) и по таймауту; в любом исходе снимает оба слушателя и таймер, чтобы элемент
 * не держался замыканием после конвертации.
 *
 * @param target — элемент, чьё событие ждём
 * @param event — имя события
 * @param timeoutMs — сколько ждать до отказа
 * @returns промис, разрешённый событием
 */
export const waitForEvent = (
  target: EventTarget,
  event: string,
  timeoutMs = EVENT_TIMEOUT_MS
) => {
  return new Promise<void>((resolve, reject) => {
    const listeners = new AbortController();
    const timer = setTimeout(() => {
      listeners.abort();
      reject(new Error(t('error.convert.videoTimeout', { event })));
    }, timeoutMs);

    const settle = () => {
      clearTimeout(timer);
      listeners.abort();
    };

    target.addEventListener(
      event,
      () => {
        settle();
        resolve();
      },
      { signal: listeners.signal }
    );
    target.addEventListener(
      'error',
      () => {
        settle();
        reject(new Error(t('error.convert.videoFailed', { event })));
      },
      { signal: listeners.signal }
    );
  });
};
