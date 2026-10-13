/**
 * Прежняя разметка amo web — без стабильных атрибутов. Поле ввода узнаётся по aria-атрибутам и
 * стабильным tailwind-классам, сообщение — по `id` корня, классам CSS-модулей и пути в дереве.
 *
 * Корни поиска исключают узлы со стабильными маркерами: у новой amo классы и структура те же, и
 * без исключения её поле и сообщения нашлись бы и этой разметкой.
 */

import type { AmoMarkup, Composer, ShownNode } from './amoDom.types';
import {
  COMPOSER_BUTTON,
  shownCompose,
  STABLE_COMPOSE_INPUT_ATTR,
  STABLE_MESSAGE_ATTR,
} from './amoDomStable';
import { TOKEN_QUOTE_SPACING, TOKEN_QUOTE_SURFACE } from './amoDomStyle';
import { MARKER_NAME_PART, STICKER_NAME_PART } from './fileName';

const EDITABLE_SELECTOR = `div[contenteditable="true"][aria-placeholder]:not([${STABLE_COMPOSE_INPUT_ATTR}])`;
const ROW_SELECTOR = 'div.flex.size-full';

/**
 * Корень блока ввода: содержит и кнопку отправки, и кнопку отмены редактирования.
 */
const COMPOSE_ROOT_SELECTOR = 'div.flex-nowrap';
const SEND_BUTTON_SELECTOR = '[aria-label="Send message"]';
const CANCEL_EDIT_SELECTOR = '[aria-label="cancel edit"]';

/**
 * Обёртку эмодзи узнаём по паре классов: других стабильных признаков у неё нет.
 */
const EMOJI_WRAP_CLASSES = ['z-100', 'w-4.5'];

const isEmojiWrap = (el: Element): el is HTMLElement => {
  return (
    el instanceof HTMLElement &&
    EMOJI_WRAP_CLASSES.every((className) => {
      return el.classList.contains(className);
    })
  );
};

/**
 * Кнопки скрыты через size-0/opacity-0 и становятся видимыми с opacity-100.
 *
 * @param button — кнопка «Отправить» или отмены редактирования
 * @returns true — кнопка показана
 */
const isShown = (button: ShownNode) => {
  return button.classList.contains('opacity-100');
};

const findComposers = (root: ParentNode): Composer[] => {
  const result: Composer[] = [];

  for (const editable of root.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR)) {
    const row = editable.closest<HTMLElement>(ROW_SELECTOR);

    if (!row) continue;
    const emojiWrap = Array.from(row.children).find(isEmojiWrap);

    if (!emojiWrap) continue;
    const composeRoot = row.closest<HTMLElement>(COMPOSE_ROOT_SELECTOR);

    result.push({
      editable,
      row,
      emojiWrap,
      sendButton: composeRoot?.querySelector<HTMLElement>(SEND_BUTTON_SELECTOR) || null,
      cancelEditButton:
        composeRoot?.querySelector<HTMLElement>(CANCEL_EDIT_SELECTOR) || null,
      markup: legacyMarkup,
    });
  }

  return result;
};

/**
 * Классы CSS-модулей amo — `<имя>-<хэш>`, хэш меняется от сборки к сборке, поэтому
 * селекторы держатся за основу `[class*="<имя>-"]`, `id` корня сообщения, структуру и `alt`.
 *
 * Корень со стабильным маркером исключён: такое сообщение стилизует `amoDomStable.ts`, а все
 * селекторы этой разметки отсчитаны от корня, поэтому исключения в нём одном достаточно.
 *
 * Исключено и сообщение с заголовком, где имя — не кнопка, а простой `div`, как у пересылки в
 * «Избранное». Там у пересылки нет ни блока «Forwarded from», ни `forwarded-` на обёртке медиа, и
 * заголовок с именем — единственный её признак: без пузыря он повис бы над стикером.
 */
const MESSAGE_SELECTOR = `[id^="message+"]:not([${STABLE_MESSAGE_ATTR}]):not(:has(> div > div > div:first-child:not([class]) > div))`;

/**
 * Обёртка медиа ленты. `:only-child` отсекает подпись и футер с реакциями, `forwarded-` —
 * пересылку, `media_wrapper_with_text-` — медиа с текстом: такие сообщения остаются в пузыре.
 */
const MEDIA_SELECTOR =
  '[class*="media_wrapper_photo-"]:only-child:not([class*="forwarded-"]):not([class*="media_wrapper_with_text-"])';

const MEDIA_CONTAINER_SELECTOR = '[class*="photo_media_container-"]';
const OUR_IMG_SELECTOR = `img[alt*="${MARKER_NAME_PART}"]`;
const STICKER_IMG_SELECTOR = `${OUR_IMG_SELECTOR}[alt*="${STICKER_NAME_PART}"]`;

/**
 * Путь от корня сообщения до обёртки медиа: ряд → пузырь → обёртка содержимого → медиа.
 * Картинка с тем же `alt` в цитате ответа, пересылке, просмотрщике и превью лежит по
 * другому пути и не задевается.
 */
const MEDIA_PATH = `${MESSAGE_SELECTOR} > div > div > div > ${MEDIA_SELECTOR}`;

const BUBBLE_SELECTOR = `${MESSAGE_SELECTOR} > div > div:has(> div > ${MEDIA_SELECTOR} ${OUR_IMG_SELECTOR})`;

/**
 * Пузырь ответа нашей картинкой — от него отсчитывается плашка цитаты: у пузыря amo уже
 * `position: relative`.
 */
const REPLY_BUBBLE_SELECTOR = `${MESSAGE_SELECTOR}[class*="message_with_reply-"] > div > div:has(> div > ${MEDIA_SELECTOR} ${OUR_IMG_SELECTOR})`;

/**
 * Плашка цитаты — блок пузыря прямо перед обёрткой содержимого с нашим медиа. Строка автора
 * лежит на том же месте у сообщения без ответа, но у неё кнопка имени — она не плашка.
 *
 * Класс `-mt-2` блока цитаты amo — в субъекте селектора: правило с голым `div` в субъекте
 * браузер проверял бы на каждом `div` страницы при каждой правке ленты, и добавление
 * сообщения в длинную ленту замедлялось бы в десятки раз (замер на стенде: 2,3 с против
 * 0,06 с на 800 сообщений). С классом проверяются только блоки с ним.
 */
const QUOTE_CLASS_SELECTOR = '.\\-mt-2';
const QUOTE_SELECTOR = `${REPLY_BUBBLE_SELECTOR} > div${QUOTE_CLASS_SELECTOR}:not(:has(> button)):has(+ div > ${MEDIA_SELECTOR})`;

/**
 * Кнопка медиа стикера: её `div` задаёт место под картинку, `img` — сам стикер.
 */
const STICKER_SELECTOR = `${MEDIA_PATH} > ${MEDIA_CONTAINER_SELECTOR}:has(> div > ${STICKER_IMG_SELECTOR})`;

export const legacyMarkup: AmoMarkup = {
  ...shownCompose(isShown),
  findComposers,
  button: COMPOSER_BUTTON,
  message: {
    bubble: BUBBLE_SELECTOR,
    tail: `${MESSAGE_SELECTOR}:has(${MEDIA_SELECTOR} ${OUR_IMG_SELECTOR}) [class*="message_tail-"]`,
    backdrop: `${MEDIA_PATH} > ${MEDIA_CONTAINER_SELECTOR}:has(${OUR_IMG_SELECTOR}) > div:has(> canvas)`,

    /**
     * Строка имени автора — первый ребёнок пузыря с кнопкой имени; у сообщения без заголовка
     * первый ребёнок — обёртка содержимого, прямой кнопки в ней нет.
     */
    author: `${BUBBLE_SELECTOR} > div:first-child:has(> button)`,
    image: `${MEDIA_PATH} > ${MEDIA_CONTAINER_SELECTOR} > div > ${OUR_IMG_SELECTOR}`,
    stickerButton: STICKER_SELECTOR,
    stickerSizing: {
      by: 'image',
      frame: `${STICKER_SELECTOR} > div:has(> img)`,
      image: `${STICKER_SELECTOR} > div > ${STICKER_IMG_SELECTOR}`,
    },

    /**
     * Слой отправки — заливка со спиннером рядом с `img`, пока файл уходит на сервер. В субъекте —
     * класс заливки, а не голый `div`, по той же причине, что `-mt-2` у плашки. До загрузки
     * картинки `img` нет, и стикер не узнать: заглушка скачивания остаётся как у amo.
     */
    stickerSpinnerLayer: `${STICKER_SELECTOR} > div > div.bg-gray-260`,
    quote: QUOTE_SELECTOR,

    /**
     * Плашка у стикера и у GIF считает место рядом по-разному: пузырь стикера не шире стикера
     * с отступами, а пузырь GIF — доля ряда.
     */
    stickerQuote: `${QUOTE_SELECTOR}:has(+ div ${STICKER_IMG_SELECTOR})`,
    gifQuote: `${QUOTE_SELECTOR}:not(:has(+ div ${STICKER_IMG_SELECTOR}))`,

    /**
     * Ряд сообщения-ответа нашей картинкой; остальные ряды ленты контейнерами не становятся.
     */
    replyRow: `${MESSAGE_SELECTOR}[class*="message_with_reply-"]:has(> div > div > div > ${MEDIA_SELECTOR} ${OUR_IMG_SELECTOR}) > div`,

    /**
     * Класс `top-0` обёртки панели — в субъекте селектора по той же причине, что `-mt-2` у
     * плашки: голый `div` с `:has()` в субъекте проверялся бы на каждом `div` страницы при
     * каждой правке ленты. Этот же класс правило и переопределяет.
     */
    replyControls: `${REPLY_BUBBLE_SELECTOR} > div.top-0:has(> [class*="message_controls-"])`,

    /**
     * Направление сообщения — класс на корне: у исходящего плашка слева от картинки, у
     * входящего — справа.
     */
    outgoing: '[class*="is_outgoing-"]',

    /**
     * Входящее под заголовком автора — в его ряду рядом с пузырём ещё и аватар.
     */
    withAvatar: '[class*="message_with_user-"]:not([class*="is_outgoing-"])',
    headedMedia: null,
    quoteSurface: TOKEN_QUOTE_SURFACE,
    quoteSpacing: TOKEN_QUOTE_SPACING,
  },
};
