/**
 * Стабильная разметка amo web — атрибуты `data-compose-*`, `data-feed-*` и `data-photo-*`, которые
 * amo ставит как контракт для внешних скриптов. Классы и структура дерева здесь не используются:
 * от правки вёрстки amo атрибуты не меняются.
 */

import type {
  AmoMarkup,
  ButtonMarkup,
  ComposeMarkup,
  Composer,
  ShownNode,
} from './amoDom.types';
import { TOKEN_QUOTE_SPACING, TOKEN_QUOTE_SURFACE } from './amoDomStyle';
import { MARKER_NAME_PART, STICKER_NAME_PART } from './fileName';

/**
 * Корни поиска стабильной разметки. Прежняя разметка исключает узлы с ними
 * (`amoDomLegacy.ts`): классы и структура у новой amo те же, и без исключения одно поле и одно
 * сообщение нашлись бы обеими разметками.
 */
export const STABLE_COMPOSE_INPUT_ATTR = 'data-compose-input';
export const STABLE_MESSAGE_ATTR = 'data-feed-message';

const INPUT_SELECTOR = `[${STABLE_COMPOSE_INPUT_ATTR}]`;
const ROW_SELECTOR = '[data-compose-row]';
const EMOJI_SELECTOR = ':scope > [data-compose-emoji]';
const COMPOSE_SELECTOR = '[data-compose]';
const SEND_SELECTOR = '[data-compose-send]';
const CANCEL_EDIT_SELECTOR = '[data-compose-cancel-edit]';
const VISIBLE_ATTR = 'data-visible';

/**
 * Пересылка, в том числе в «Избранное», остаётся в пузыре: `data-forwarded` — её единственный
 * признак, у пересылки в «Избранное» нет ни заголовка «Forwarded from», ни признака на медиа.
 */
const MESSAGE = `[${STABLE_MESSAGE_ATTR}]:not([data-forwarded])`;

/**
 * Медиа без подписи и пересылки. `:only-child` отсекает футер с реакциями списком: он лежит в
 * обёртке содержимого рядом с медиа, и такое сообщение остаётся в пузыре.
 */
const MEDIA =
  '[data-feed-media="photo"]:only-child:not([data-forwarded]):not([data-with-text])';

/**
 * Наш контейнер картинки узнаётся по имени файла на нём самом: атрибут стоит и в заглушке, пока
 * `img` нет, и после загрузки, на одном элементе.
 */
const OUR_FRAME = `[data-photo-frame][data-file-name*="${MARKER_NAME_PART}"]`;
const STICKER_FRAME = `${OUR_FRAME}[data-file-name*="${STICKER_NAME_PART}"]`;

/**
 * Содержимое пузыря с нашей картинкой, от обёртки содержимого до контейнера картинки.
 */
const OUR_CONTENT = `[data-feed-content] > ${MEDIA} > [data-feed-photo] > ${OUR_FRAME}`;
const STICKER_CONTENT = `[data-feed-content] > ${MEDIA} > [data-feed-photo] > ${STICKER_FRAME}`;

const ROW = `${MESSAGE} > [data-feed-row]`;
const BUBBLE = `${ROW} > [data-feed-bubble]:has(> ${OUR_CONTENT})`;
const PHOTO = `${BUBBLE} > [data-feed-content] > ${MEDIA} > [data-feed-photo]`;
const STICKER_FRAME_PATH = `${PHOTO} > ${STICKER_FRAME}`;

const REPLY_MESSAGE = `${MESSAGE}[data-with-reply]`;
const REPLY_BUBBLE = `${REPLY_MESSAGE} > [data-feed-row] > [data-feed-bubble]:has(> ${OUR_CONTENT})`;

/**
 * Плашка цитаты — цитата ответа прямо перед обёрткой содержимого с нашей картинкой.
 */
const QUOTE = `${REPLY_BUBBLE} > [data-feed-reply-quote]:has(+ ${OUR_CONTENT})`;

/**
 * Черновик по видимости кнопок, найденных вместе с полем, — для разметок, где «Отправить» и
 * отмена редактирования смонтированы всегда и только прячутся: «Отправить» видна, если в поле
 * текст или вложения, отмена — пока идёт редактирование.
 *
 * @param isShown — признак видимости кнопки в этой разметке
 * @returns часть разметки, которую спрашивает отправка
 */
export const shownCompose = (isShown: (button: ShownNode) => boolean): ComposeMarkup => {
  return {
    isEditing: ({ cancelEditButton }) => {
      return Boolean(cancelEditButton && isShown(cancelEditButton));
    },
    isDraftEmpty: ({ sendButton }) => {
      return !sendButton || !isShown(sendButton);
    },
    sendButtonOf: ({ sendButton }) => {
      return sendButton && isShown(sendButton) ? sendButton : null;
    },
  };
};

/**
 * Кнопка смонтирована всегда и прячется классами amo: видимость — только по маркеру.
 *
 * @param button — кнопка «Отправить» или отмены редактирования
 * @returns true — кнопка показана
 */
const isShown = (button: ShownNode) => {
  return button.hasAttribute(VISIBLE_ATTR);
};

/**
 * Классы повторяют обёртку кнопки эмодзи. Базовый `fill` заменяется, а не дополняется: из двух
 * `fill-*` на элементе победит тот, что стоит позже в CSS amo, а не тот, что нужен.
 *
 * В режиме редактирования иконка эмодзи светлеет только в тёмной теме — светлый `fill` тот же.
 */
export const COMPOSER_BUTTON: ButtonMarkup = {
  wrapClass: 'relative z-100 mb-0 mr-3 flex h-full w-4.5 cursor-default items-end',
  innerClass: 'flex h-8 items-center',
  iconClass:
    'pointer-events-auto size-4.5 cursor-pointer fill-cadetGray-30 p-0 transition-all duration-base ease-linear dark:fill-gray-70',
  idleClasses: ['fill-cadetGray-30', 'dark:fill-gray-70'],
  openClasses: ['fill-blue-50', 'dark:fill-beige-70'],
  editClasses: ['fill-cadetGray-30', 'dark:fill-gray-40'],
  anchor: 'composer',
};

const findComposers = (root: ParentNode): Composer[] => {
  const result: Composer[] = [];

  for (const editable of root.querySelectorAll<HTMLElement>(INPUT_SELECTOR)) {
    const row = editable.closest<HTMLElement>(ROW_SELECTOR);
    const emojiWrap = row?.querySelector<HTMLElement>(EMOJI_SELECTOR);

    if (!row || !emojiWrap) continue;
    const compose = row.closest<HTMLElement>(COMPOSE_SELECTOR);

    result.push({
      editable,
      row,
      emojiWrap,
      sendButton: compose?.querySelector<HTMLElement>(SEND_SELECTOR) || null,
      cancelEditButton: compose?.querySelector<HTMLElement>(CANCEL_EDIT_SELECTOR) || null,
      markup: stableMarkup,
    });
  }

  return result;
};

export const stableMarkup: AmoMarkup = {
  ...shownCompose(isShown),
  findComposers,
  button: COMPOSER_BUTTON,
  pageSelector: `${INPUT_SELECTOR}, [${STABLE_MESSAGE_ATTR}]`,
  message: {
    bubble: BUBBLE,
    tail: `${ROW}:has(> [data-feed-bubble] > ${OUR_CONTENT}) > [data-feed-bubble-tail]`,
    backdrop: `${PHOTO}:has(> ${OUR_FRAME}) > [data-photo-backdrop]`,
    author: `${BUBBLE} > [data-feed-author]`,
    image: `${PHOTO} > ${OUR_FRAME} > img`,
    stickerButton: `${PHOTO}:has(> ${STICKER_FRAME})`,
    stickerSizing: {
      by: 'frame',
      frame: STICKER_FRAME_PATH,
    },
    stickerSpinnerLayer: `${STICKER_FRAME_PATH} > [data-photo-placeholder]`,
    quote: QUOTE,
    stickerQuote: `${QUOTE}:has(+ ${STICKER_CONTENT})`,
    gifQuote: `${QUOTE}:not(:has(+ ${STICKER_CONTENT}))`,
    replyRow: `${REPLY_MESSAGE} > [data-feed-row]:has(> [data-feed-bubble] > ${OUR_CONTENT})`,
    replyControls: `${REPLY_BUBBLE} > [data-feed-controls]`,
    outgoing: '[data-outgoing]',
    withAvatar: '[data-with-author]:not([data-outgoing])',
    headedMedia: null,
    quoteSurface: TOKEN_QUOTE_SURFACE,
    quoteSpacing: TOKEN_QUOTE_SPACING,
  },
};
