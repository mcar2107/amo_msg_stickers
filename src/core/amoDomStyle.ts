/**
 * Стиль своих сообщений в ленте amo — одни правила для любой разметки: что меняется у нашего
 * сообщения, задаёт этот модуль, а где оно в DOM — селекторы разметки (`MessageSelectors`).
 */

import { tailwindConfig } from '../../tailwind.config';

import type {
  MessageSelectors,
  QuoteLayout,
  QuoteRoom,
  QuoteSpacing,
  QuoteSurface,
  StickerSizing,
} from './amoDom.types';

/**
 * Лимит стороны стикера в ленте — как у стикеров Telegram.
 */
const STICKER_MAX_SIDE_PX = 208;

/**
 * Ряд сообщения-ответа нашей картинкой — контейнер `REPLY_CONTAINER`: ширина плашки и переход
 * в узкий режим считаются от ширины ряда (`cqw`, container query).
 */
const REPLY_CONTAINER = 'amostk-reply';

const { borderRadius } = tailwindConfig.theme.extend;
const { boxShadow, colors } = tailwindConfig.theme;

/**
 * Поверхность плашки в стабильной и прежней разметках — фон, скругление и тень пузыря amo того
 * же направления и темы: цвета текста цитаты amo подобраны под него. Значения — из токенов
 * классов пузыря: входящий — `from-gray-110 to-white-0`, `dark:bg-black-60`; исходящий —
 * `from-flowerBlue-20 to-blue-120`, `dark:bg-beige-80`; `rounded-lgx` и `shadow-md`. Тёмная тема
 * этих разметок — класс `dark` на `<html>`.
 */
export const TOKEN_QUOTE_SURFACE: QuoteSurface = {
  incoming: `linear-gradient(to top, ${colors.gray[110]}, ${colors.white[0]})`,
  outgoing: `linear-gradient(to top, ${colors.flowerBlue[20]}, ${colors.blue[120]})`,
  dark: {
    incoming: colors.black[60],
    outgoing: colors.beige[80],
  },
  radius: borderRadius.lgx,
  shadow: boxShadow.md,
};

/**
 * Отступы плашки в стабильной и прежней разметках: картинка сдвинута от края пузыря на `p-2`
 * минус выход обёртки медиа за отступ (`-m-1`), у края ряда — слот чекбокса выбора сообщений
 * (`size-5`).
 */
export const TOKEN_QUOTE_SPACING: QuoteSpacing = {
  mediaInsetPx: 4,
  mediaBleedPx: 4,
  rowEdgePx: 20,
};

/**
 * Плашка занимает свободное место ряда рядом с картинкой, но не шире 260 px; длинную цитату
 * обрезает сама amo. Уже 90 px цитата не читается — тогда плашка встаёт над картинкой.
 */
const QUOTE_MAX_WIDTH_PX = 260;
const QUOTE_MIN_WIDTH_PX = 90;

/**
 * Плашка отсчитывается от места картинки в пузыре (`QuoteSpacing.mediaInsetPx`), чтобы её верх
 * совпал с верхом картинки, а между ними было 10 px.
 */
const QUOTE_TO_MEDIA_PX = 10;

/**
 * Колонка аватара в ряду (`w-11.5`).
 */
const ROW_AVATAR_PX = 46;

/**
 * Пузырь GIF amo не шире 65% ряда, и рядом с ним остаётся не меньше 35%.
 */
const GIF_FREE_ROW_SHARE = 35;

/**
 * @param spacing — отступы плашки разметки
 * @returns зазор между краем пузыря и плашкой, px
 */
const quoteGapOf = ({ mediaInsetPx }: QuoteSpacing) => {
  return QUOTE_TO_MEDIA_PX - mediaInsetPx;
};

/**
 * Над зоной наведения пузыря (`::after`, поверх соседнего места ряда) и панелью действий
 * (`z-20`): иначе клик по цитате ушёл бы им.
 */
const QUOTE_Z_INDEX = 30;

/**
 * Варианты плашки по осям «стикер или GIF» и «есть ли в ряду аватар»: у каждого своё место
 * рядом с картинкой и свой порог узкого ряда.
 *
 * @param selectors — цели стиля разметки
 * @returns варианты плашки
 */
const quoteLayoutsOf = ({
  gifQuote,
  stickerQuote,
  withAvatar,
  quoteSpacing,
  headedMedia,
}: MessageSelectors): QuoteLayout[] => {
  const reservePx = quoteGapOf(quoteSpacing) + quoteSpacing.rowEdgePx;
  const avatarReservePx = reservePx + ROW_AVATAR_PX;
  const common = { spacing: quoteSpacing, headShiftPx: headedMedia?.shiftPx || 0 };

  return [
    { selector: gifQuote, media: 'gif', reservePx, ...common },
    { selector: stickerQuote, media: 'sticker', reservePx, ...common },
    {
      selector: `${withAvatar}${gifQuote}`,
      media: 'gif',
      reservePx: avatarReservePx,
      ...common,
    },
    {
      selector: `${withAvatar}${stickerQuote}`,
      media: 'sticker',
      reservePx: avatarReservePx,
      ...common,
    },
  ];
};

/**
 * Пузырь стикера не шире стикера с отступами, и место рядом — ряд минус пузырь; пузырь GIF —
 * доля ряда, и рядом остаётся `GIF_FREE_ROW_SHARE`. Порог узкого ряда — ширина, при которой
 * это место стало бы уже `QUOTE_MIN_WIDTH_PX`.
 *
 * @param layout — вариант плашки
 * @returns свободное место рядом с картинкой (выражение `calc`) и порог узкого ряда, px
 */
const quoteRoomOf = ({ media, reservePx, spacing }: QuoteLayout): QuoteRoom => {
  /**
   * Пузырь стикера — стикер и его отступы в пузыре.
   */
  const stickerBubblePx = STICKER_MAX_SIDE_PX + 2 * spacing.mediaInsetPx;

  switch (media) {
    case 'gif': {
      return {
        freeCalc: `${GIF_FREE_ROW_SHARE}cqw - ${reservePx}px`,
        narrowRowPx: Math.ceil(
          ((QUOTE_MIN_WIDTH_PX + reservePx) * 100) / GIF_FREE_ROW_SHARE
        ),
      };
    }

    case 'sticker': {
      return {
        freeCalc: `100cqw - ${stickerBubblePx + reservePx}px`,
        narrowRowPx: QUOTE_MIN_WIDTH_PX + stickerBubblePx + reservePx,
      };
    }

    default: {
      const unknownMedia: never = media;

      throw new Error(`Unknown quote media: ${String(unknownMedia)}`);
    }
  }
};

/**
 * Сбоку плашка не шире свободного места; в узком ряду встаёт над картинкой шириной с неё —
 * `width: 0` не даёт ей растянуть пузырь, `min-width` растягивает по картинке, которая
 * выходит за поле пузыря на `mediaBleedPx` с каждой стороны. `min-width` сильнее
 * `max-width` бокового режима. Отступ до картинки — 10 px и подъём картинки под шапкой: она
 * поднята и под плашкой в потоке.
 *
 * @param layout — вариант плашки
 * @returns CSS ширины плашки и её узкого режима
 */
const quoteLayoutCss = (layout: QuoteLayout) => {
  const { selector, spacing, headShiftPx } = layout;
  const { mediaBleedPx } = spacing;
  const { freeCalc, narrowRowPx } = quoteRoomOf(layout);

  return `${selector} {
  max-width: min(${QUOTE_MAX_WIDTH_PX}px, calc(${freeCalc}));
}
@container ${REPLY_CONTAINER} (width < ${narrowRowPx}px) {
  ${selector} {
    position: static;
    width: 0;
    min-width: calc(100% + ${2 * mediaBleedPx}px);
    margin: 0 -${mediaBleedPx}px ${QUOTE_TO_MEDIA_PX + headShiftPx}px;
  }
}`;
};

/**
 * Сторона места под стикер из переменных сторон: размер, вписанный в `STICKER_MAX_SIDE_PX` с
 * сохранением пропорций и без увеличения. В стабильной разметке amo уже вписал натуральный
 * размер в свой предел без увеличения, а вписать в предел и потом в лимит — то же, что сразу в
 * лимит.
 *
 * @param side — переменная своей стороны
 * @param widthVar — переменная ширины
 * @param heightVar — переменная высоты
 * @returns выражение CSS для `width` или `height`
 */
const fittedSide = (side: string, widthVar: string, heightVar: string) => {
  return `min(calc(var(${side}) * 1px), calc(${STICKER_MAX_SIDE_PX}px * var(${side}) / max(var(${widthVar}), var(${heightVar}))))`;
};

const MEDIA_WIDTH_VAR = '--media-w';
const MEDIA_HEIGHT_VAR = '--media-h';

/**
 * Место под картинку amo задаёт inline `width` / `height` контейнера над `img` — его размер
 * сбрасывается или пересчитывается, `!important` — только против inline-стиля amo.
 *
 * Размер по картинке: контейнер в `auto`, картинка вписывается в лимит сама — до загрузки
 * размер не известен. Размер по контейнеру или по переменным коробки: место встаёт в итоговый
 * размер ещё в заглушке, а картинка заполняет его, как у amo, поэтому её появление ничего не
 * сдвигает.
 *
 * @param sizing — чем задан размер места под стикер в разметке
 * @returns CSS размера стикера
 */
const stickerSizingCss = (sizing: StickerSizing) => {
  switch (sizing.by) {
    case 'image': {
      return `${sizing.frame} {
  width: auto !important;
  height: auto !important;
}
${sizing.image} {
  width: auto;
  height: auto;
  max-width: ${STICKER_MAX_SIDE_PX}px;
  max-height: ${STICKER_MAX_SIDE_PX}px;
}`;
    }

    case 'frame': {
      return `${sizing.frame} {
  width: ${fittedSide(MEDIA_WIDTH_VAR, MEDIA_WIDTH_VAR, MEDIA_HEIGHT_VAR)} !important;
  height: ${fittedSide(MEDIA_HEIGHT_VAR, MEDIA_WIDTH_VAR, MEDIA_HEIGHT_VAR)} !important;
}`;
    }

    case 'vars': {
      const { box, boxWidth, widthVar, heightVar } = sizing;
      const width = fittedSide(widthVar, widthVar, heightVar);

      return `${box} {
  width: ${width} !important;
  height: ${fittedSide(heightVar, widthVar, heightVar)} !important;
}
${boxWidth} {
  width: ${width} !important;
}`;
    }

    default: {
      const unknownSizing: never = sizing;

      throw new Error(`Unknown sticker sizing: ${JSON.stringify(unknownSizing)}`);
    }
  }
};

/**
 * Картинка под шапкой, которую стиль убрал из потока, поднимается на место картинки без шапки:
 * стикер-ответ стоит там же, где стикер без ответа.
 *
 * @param headedMedia — картинка под шапкой и подъём; null — правила нет
 * @returns CSS правила с переводом строки или пустая строка
 */
const headedMediaCss = (headedMedia: MessageSelectors['headedMedia']) => {
  if (!headedMedia) return '';

  return `${headedMedia.selector} {
  margin-top: -${headedMedia.shiftPx}px;
}
`;
};

/**
 * Фон плашки в тёмной теме по классу `dark` на `<html>` — для поверхности из токенов; фон из
 * переменных страницы следует её теме сам, и правила нет.
 *
 * @param selector — селектор плашки
 * @param background — фон в тёмной теме; нет — правило не нужно
 * @returns CSS правила с переводом строки или пустая строка
 */
const darkQuoteCss = (selector: string, background: string | undefined) => {
  if (!background) return '';

  return `html.dark ${selector} {
  background: ${background};
}
`;
};

/**
 * Ответ нашей картинкой — тоже своё сообщение: картинка выглядит как без ответа, а цитата
 * выносится плашкой рядом с ней, как в Telegram. У сообщения под заголовком автора
 * скрывается строка имени.
 *
 * Кнопка медиа стикера держит `min-width` / `min-height: 100px` — сбрасывается, иначе вокруг
 * стикера осталась бы пустая рамка прежнего размера. `object-fit: contain` — у всех наших
 * картинок: при `object-cover` и неполном сбросе размеров стикер обрезался бы. Оверлей времени и
 * статуса не трогается.
 *
 * Слой со спиннером поверх стикера — без заливки: стикер прозрачный, и сплошной серый слой amo,
 * пока файл скачивается или отправляется, выглядел бы серым блоком вместо стикера. Спиннер
 * остаётся.
 *
 * @param selectors — цели стиля одной разметки amo
 * @returns CSS своих сообщений в этой разметке
 */
export const messageCss = (selectors: MessageSelectors) => {
  const {
    bubble,
    tail,
    backdrop,
    author,
    image,
    stickerButton,
    stickerSizing,
    stickerSpinnerLayer,
    quote,
    replyRow,
    replyControls,
    outgoing,
    quoteSurface,
    quoteSpacing,
    headedMedia,
  } = selectors;
  const gapPx = quoteGapOf(quoteSpacing);

  return `
${bubble} {
  background: none;
  box-shadow: none;
  border-radius: 0;
}
${tail},
${backdrop},
${author} {
  display: none;
}
${image} {
  object-fit: contain;
}
${stickerButton} {
  min-width: 0;
  min-height: 0;
  width: auto;
}
${stickerSizingCss(stickerSizing)}
${stickerSpinnerLayer} {
  background: none;
}
${headedMediaCss(headedMedia)}${quote} {
  position: absolute;
  top: ${quoteSpacing.mediaInsetPx}px;
  left: calc(100% + ${gapPx}px);
  z-index: ${QUOTE_Z_INDEX};
  width: max-content;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border-radius: ${quoteSurface.radius};
  box-shadow: ${quoteSurface.shadow};
  background: ${quoteSurface.incoming};
}
${darkQuoteCss(quote, quoteSurface.dark?.incoming)}${outgoing}${quote} {
  left: auto;
  right: calc(100% + ${gapPx}px);
  background: ${quoteSurface.outgoing};
}
${darkQuoteCss(`${outgoing}${quote}`, quoteSurface.dark?.outgoing)}${replyRow} {
  container: ${REPLY_CONTAINER} / inline-size;
}
${quoteLayoutsOf(selectors).map(quoteLayoutCss).join('\n')}
${replyControls} {
  top: auto;
  bottom: 0;
}
`;
};
