import { isMotionReduced } from '../../scrollMotion/scrollMotion';

import type { PreviewLeave, PreviewOpenTargets, RectLike } from './previewMotion.types';

/**
 * Длительность вылета картинки из ячейки, мс. Спека — не дольше 300 мс.
 */
export const PREVIEW_FLY_MS = 280;

/**
 * Длительность появления эмодзи, мс.
 */
export const EMOJI_POP_MS = 280;

/**
 * Задержка появления эмодзи, мс: он выезжает вслед за картинкой, а не вместе с ней.
 */
export const EMOJI_POP_DELAY_MS = 120;

/**
 * Длительность возврата картинки в ячейку, мс. Спека — не дольше 250 мс: уход короче вылета,
 * пользователь уже насмотрелся и ждёт ленту.
 */
export const PREVIEW_LEAVE_MS = 220;

/**
 * Длительность сжатия эмодзи при уходе, мс.
 */
export const EMOJI_LEAVE_MS = 160;

/**
 * Кривая возврата: стандартное замедление к концу — картинка сразу видимо трогается с места и
 * мягко садится в ячейку.
 */
const LEAVE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * Кривая сжатия эмодзи: разгон к нулю.
 */
const EMOJI_LEAVE_EASING = 'ease-in';

/**
 * Кривая полёта: плавный старт и мягкая остановка на месте. Кривая с резким стартом проходит
 * почти весь путь за первые кадры, и отрыв от ячейки не успевает читаться — виден только
 * пролёт; здесь первые десятки миллисекунд картинка ещё стоит у ячейки.
 */
const FLY_EASING = 'cubic-bezier(0.3, 0, 0.15, 1)';

/**
 * Сколько ждать готовую картинку перед стартом полёта, мс: у ячейки она уже загружена, и
 * обычно ожидания нет, а на редкий сбой анимация не должна зависать.
 */
const IMAGE_WAIT_MS = 150;

/**
 * Кривая эмодзи: перелёт за конечный размер и возврат — «выскакивает».
 */
const EMOJI_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/**
 * Начало появления эмодзи: нулевой масштаб и сдвиг на 1,5rem вниз — он выезжает чуть снизу.
 */
const EMOJI_FROM = 'translateY(1.5rem) scale(0)';

/**
 * Трансформация, с которой картинка предпросмотра стоит на месте ячейки: сдвиг центра и
 * масштаб. Масштаб — по большей стороне: вписанная в ячейку картинка упирается в неё большей
 * стороной, а внутри квадрата предпросмотра — тоже.
 *
 * @param from — прямоугольник картинки в ячейке
 * @param to — квадрат картинки в предпросмотре
 * @returns значение `transform` для начала полёта; `null` — полёта нет: у одного из
 * прямоугольников нет размера
 */
export const flyTransform = (from: RectLike, to: RectLike): string | null => {
  const fromSide = Math.max(from.width, from.height);
  const toSide = Math.max(to.width, to.height);

  if (!fromSide || !toSide) return null;

  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);

  return `translate(${dx}px, ${dy}px) scale(${fromSide / toSide})`;
};

/**
 * Прямоугольник, который занимает картинка при `object-fit: contain` с центровкой: вписана в
 * элемент с сохранением пропорций, по свободной оси — поля поровну с двух сторон.
 *
 * @param box — прямоугольник элемента `img`
 * @param naturalWidth — собственная ширина картинки, px
 * @param naturalHeight — собственная высота картинки, px
 * @returns видимая картинка внутри элемента; без собственного размера (не загружена,
 * без размеров) или у элемента без размера — весь прямоугольник элемента
 */
export const containRect = (
  box: RectLike,
  naturalWidth: number,
  naturalHeight: number
): RectLike => {
  const { left, top, width, height } = box;

  if (!naturalWidth || !naturalHeight || !width || !height) {
    return { left, top, width, height };
  }

  const scale = Math.min(width / naturalWidth, height / naturalHeight);
  const contentWidth = naturalWidth * scale;
  const contentHeight = naturalHeight * scale;

  return {
    left: left + (width - contentWidth) / 2,
    top: top + (height - contentHeight) / 2,
    width: contentWidth,
    height: contentHeight,
  };
};

/**
 * Прямоугольник картинки ячейки-источника: то, что видит пользователь. У кнопки вокруг неё
 * есть отступ, поэтому берётся `img` внутри, а сама кнопка — только если картинки нет.
 *
 * Картинка, вписанная в свой элемент `object-fit: contain` (превью черновика на всю зону
 * загрузки), занимает лишь его часть: полёт стартует от неё, а не от элемента, иначе
 * картинка вылетала бы со сдвигом и не в своём размере. У ячейки стикера элемент по
 * пропорциям картинки, и вписанный прямоугольник совпадает с ним; плитка GIF
 * (`object-fit: cover`) заполнена картинкой целиком и берётся как есть.
 *
 * @param source — кнопка ячейки
 * @returns прямоугольник относительно окна
 */
const sourceImageRect = (source: HTMLElement): RectLike => {
  const image = source.querySelector('img');

  if (!image) return source.getBoundingClientRect();

  const rect = image.getBoundingClientRect();

  if (getComputedStyle(image).objectFit !== 'contain') return rect;

  return containRect(rect, image.naturalWidth, image.naturalHeight);
};

/**
 * Держит анимацию на паузе, пока картинка не декодирована, но не дольше `IMAGE_WAIT_MS`, и
 * запускает её. Ошибка декодирования не мешает полёту. Пока шло ожидание, анимацию могли
 * отменить (закрытие или повторное открытие): `play()` на отменённой запустил бы её с нуля,
 * поэтому возобновляется только анимация, всё ещё стоящая на паузе.
 *
 * @param animation — полёт, начальное состояние которого уже показано (`fill: 'backwards'`)
 * @param image — картинка внутри летящего узла
 */
const playAfterImage = async (animation: Animation, image: HTMLImageElement) => {
  let timerId = 0;
  const timeout = new Promise<void>((resolve) => {
    timerId = window.setTimeout(resolve, IMAGE_WAIT_MS);
  });
  const decoded = image.decode().catch(() => {
    return undefined;
  });

  animation.pause();
  await Promise.race([decoded, timeout]);
  window.clearTimeout(timerId);

  if (animation.playState === 'paused') animation.play();
};

/**
 * Запускает открытие предпросмотра как в Telegram: картинка вылетает из своей ячейки, эмодзи
 * выезжает снизу из нулевого масштаба. При уменьшении движения ничего не запускает —
 * предпросмотр появляется сразу.
 *
 * Прямоугольники читаются до анимации: квадрат картинки ещё не сдвинут, и его размер
 * конечный. `fill: 'backwards'` держит начало анимации до её старта (задержка эмодзи) и не
 * оставляет трансформацию после конца.
 *
 * Если картинка предпросмотра ещё не загружена, полёт стоит на паузе в начальной точке — на
 * месте ячейки — и стартует, когда картинка готова (или через `IMAGE_WAIT_MS`): иначе она
 * появилась бы уже на полпути, и отрыв от ячейки пропал бы.
 *
 * @param targets — ячейка-источник, квадрат картинки и эмодзи
 */
export const playPreviewOpen = (targets: PreviewOpenTargets) => {
  const { source, flight, emoji } = targets;

  if (isMotionReduced()) return;

  const from = flyTransform(sourceImageRect(source), flight.getBoundingClientRect());

  if (from) {
    const flyAnimation = flight.animate([{ transform: from }, { transform: 'none' }], {
      duration: PREVIEW_FLY_MS,
      easing: FLY_EASING,
      fill: 'backwards',
    });

    const image = flight.querySelector('img');

    if (image && !image.complete) {
      void playAfterImage(flyAnimation, image);
    }
  }

  emoji?.animate([{ transform: EMOJI_FROM }, { transform: 'none' }], {
    duration: EMOJI_POP_MS,
    delay: EMOJI_POP_DELAY_MS,
    easing: EMOJI_EASING,
    fill: 'backwards',
  });
};

/**
 * Трансформация узла в данный момент: если он посреди анимации, уход стартует оттуда, а не
 * прыгает к конечному положению.
 *
 * @param element — анимируемый узел
 * @returns вычисленный `transform`; у узла без трансформации — `none`
 */
const currentTransform = (element: HTMLElement) => {
  return getComputedStyle(element).transform || 'none';
};

/**
 * Ждёт, пока доиграют или отменятся все анимации.
 *
 * @param animations — анимации ухода
 */
const settle = async (animations: Animation[]) => {
  await Promise.allSettled(
    animations.map((animation) => {
      return animation.finished;
    })
  );
};

/**
 * Запускает уход предпросмотра, обратный появлению: картинка возвращается к размеру и месту
 * своей ячейки, эмодзи сжимается до нуля. Ячейки нет на экране (не в документе или без
 * размера: попап закрыт, строка ушла из окна ленты) — картинка гаснет на месте. Прозрачность
 * подложки — CSS-переход слоя, здесь его нет.
 *
 * Конечное состояние держится (`fill: 'forwards'`) до снятия слоя: иначе картинка на кадр
 * вернулась бы в центр. Идущие анимации появления снимаются, а уход стартует с текущего
 * положения узлов — закрытие посреди вылета не прыгает. Квадрат картинки для расчёта
 * берётся у родителя летящего узла: сам он может быть сдвинут анимацией.
 *
 * @param targets — ячейка-источник, летящий узел и эмодзи
 * @returns уход: окончание и отмена; при уменьшении движения он окончен сразу
 */
export const playPreviewClose = (targets: PreviewOpenTargets): PreviewLeave => {
  const { source, flight, emoji } = targets;
  const animations: Animation[] = [];

  if (!isMotionReduced()) {
    const flightFrom = currentTransform(flight);
    const emojiFrom = emoji ? currentTransform(emoji) : 'none';
    const canvas = flight.parentElement || flight;
    const to = source.isConnected
      ? flyTransform(sourceImageRect(source), canvas.getBoundingClientRect())
      : null;

    flight.getAnimations().forEach((animation) => {
      animation.cancel();
    });
    emoji?.getAnimations().forEach((animation) => {
      animation.cancel();
    });

    animations.push(
      to
        ? flight.animate([{ transform: flightFrom }, { transform: to }], {
            duration: PREVIEW_LEAVE_MS,
            easing: LEAVE_EASING,
            fill: 'forwards',
          })
        : flight.animate(
            [
              { transform: flightFrom, opacity: 1 },
              { transform: flightFrom, opacity: 0 },
            ],
            { duration: PREVIEW_LEAVE_MS, easing: LEAVE_EASING, fill: 'forwards' }
          )
    );

    if (emoji) {
      animations.push(
        emoji.animate([{ transform: emojiFrom }, { transform: EMOJI_FROM }], {
          duration: EMOJI_LEAVE_MS,
          easing: EMOJI_LEAVE_EASING,
          fill: 'forwards',
        })
      );
    }
  }

  return {
    finished: settle(animations),
    cancel: () => {
      animations.forEach((animation) => {
        animation.cancel();
      });
    },
  };
};
