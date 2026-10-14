/**
 * Разметка Worker-версии amo web — поле ввода `[contenteditable][role="textbox"]` без
 * стабильных атрибутов и без `aria-placeholder`, в капсуле с маркером `[data-capsule-top]`.
 *
 * «Отправить» страница монтирует только при непустом черновике, а отмена правки уходит из DOM
 * анимацией, поэтому черновик читается от капсулы в момент вызова, а не по кнопкам, найденным
 * вместе с полем.
 */

import {
  MARK_BOX_SELECTOR,
  MARK_HEIGHT_VAR,
  MARK_KIND_ATTR,
  MARK_WIDTH_VAR,
} from '../shared/stickerMark';
import { ATTACHMENTS_SELECTOR, CAPSULE_TOP_SELECTOR } from '../shared/workerCompose';

import type {
  AmoMarkup,
  ButtonMarkup,
  ComposeMarkup,
  Composer,
  MessageSelectors,
  QuoteSpacing,
  QuoteSurface,
} from './amoDom.types';
import { STABLE_COMPOSE_INPUT_ATTR } from './amoDomStable';

const EDITABLE_SELECTOR = `[contenteditable][role="textbox"]:not([${STABLE_COMPOSE_INPUT_ATTR}]):not([aria-placeholder])`;

/**
 * Капсула поля — ближайший предок поля с маркером верха капсулы.
 */
const CAPSULE_SELECTOR = `:has(${CAPSULE_TOP_SELECTOR})`;
const EMOJI_SELECTOR = ':scope > button[aria-haspopup="dialog"]';
const CANCEL_EDIT_SELECTOR = ':scope > [data-compose-edit-cancel]';
const EDITING_ATTR = 'data-editing';

/**
 * Колонка чата — предок ленты `[role="log"]`; её шапка лежит выше полосы поля по `z-index`, и
 * панель, зашедшая под неё, закрыта шапкой.
 */
const CHAT_COLUMN_SELECTOR = ':has(> [role="log"])';
const CHAT_HEADER_SELECTOR = ':scope > header';

/**
 * Зазор между панелью и кнопкой, px, — как у панели эмодзи страницы. Пара классу
 * `bottom-[calc(100%+9px)]` панели в `Picker.tsx`: Tailwind не ищет классы в `.ts`.
 */
const PANEL_GAP_PX = 9;

/**
 * Высота панели пикера, px, — пара `h-[400px]` в `Picker.tsx`.
 */
const PANEL_HEIGHT_PX = 400;

/**
 * Капсула каждого найденного поля: отправка получает поле без DOM вокруг него, а черновик
 * читается от капсулы. Поле, которое страница выбросила, уходит из карты вместе с собой.
 */
const capsules = new WeakMap<object, HTMLElement>();

/**
 * «Отправить» — кнопка сразу после капсулы; страница монтирует её только тогда, когда черновик
 * можно отправить.
 *
 * @param capsule — капсула поля
 * @returns кнопка; null — её сейчас нет
 */
const sendButtonAfter = (capsule: HTMLElement) => {
  const next = capsule.nextElementSibling;

  return next instanceof HTMLButtonElement ? next : null;
};

/**
 * Черновик от капсулы, в момент вызова. Капсулы нет — поле найдено не этой разметкой, и
 * черновик считается занятым: стикер не уходит вместе с чужим черновиком.
 */
const compose: ComposeMarkup = {
  isEditing: ({ editable }) => {
    return Boolean(capsules.get(editable)?.hasAttribute(EDITING_ATTR));
  },
  isDraftEmpty: ({ editable }) => {
    const capsule = capsules.get(editable);

    if (!capsule) return false;

    return !sendButtonAfter(capsule) && !capsule.querySelector(ATTACHMENTS_SELECTOR);
  },
  sendButtonOf: ({ editable }) => {
    const capsule = capsules.get(editable);

    return capsule ? sendButtonAfter(capsule) : null;
  },
};

/**
 * Место над кнопкой до шапки колонки чата: в низком окне и над высокой полосой поля (плашка
 * ответа, многострочный текст) панель полной высоты ушла бы под шапку или за верх окна.
 *
 * @param wrap — обёртка кнопки стикеров
 * @returns наибольшая высота панели, px
 */
const panelHeight = (wrap: HTMLElement) => {
  const header = wrap.closest(CHAT_COLUMN_SELECTOR)?.querySelector(CHAT_HEADER_SELECTOR);
  const top = header ? header.getBoundingClientRect().bottom : 0;
  const room = wrap.getBoundingClientRect().top - PANEL_GAP_PX - top;

  return Math.max(0, Math.min(PANEL_HEIGHT_PX, Math.floor(room)));
};

/**
 * Кнопка повторяет кнопку эмодзи: её классы есть в CSS страницы, а иконка красится
 * `currentColor`. Иконка — во всю высоту строки (`h-8`, рисунок вписан по ширине): наведение
 * ловится на той же площади, что у кнопки эмодзи, где `hover:` стоит на самой кнопке.
 */
const WORKER_BUTTON: ButtonMarkup = {
  wrapClass: 'z-20 mr-3 flex h-8 shrink-0 self-end',
  innerClass: 'flex h-8 cursor-pointer items-center',
  iconClass:
    'h-8 w-4.5 transition-colors duration-base ease-base hover:text-accent text-fg-muted',
  iconFill: 'currentColor',
  idleClasses: ['text-fg-muted'],
  openClasses: ['text-accent'],
  anchor: 'button',
  panelHeight,
};

const findComposers = (root: ParentNode): Composer[] => {
  const result: Composer[] = [];

  for (const editable of root.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR)) {
    const capsule = editable.closest<HTMLElement>(CAPSULE_SELECTOR);
    const row = editable.parentElement?.parentElement;

    if (!capsule || !row || row === capsule || !capsule.contains(row)) continue;
    const emojiWrap = row.querySelector<HTMLElement>(EMOJI_SELECTOR);

    if (!emojiWrap) continue;
    capsules.set(editable, capsule);
    result.push({
      editable,
      row,
      emojiWrap,
      sendButton: sendButtonAfter(capsule),
      cancelEditButton:
        capsule.parentElement?.querySelector<HTMLElement>(CANCEL_EDIT_SELECTOR) || null,
      markup: workerMarkup,
    });
  }

  return result;
};

/**
 * Своё сообщение в ленте — строка `[data-key]`, которую пометил агент в мире страницы: имени
 * файла в DOM этой версии нет. Пересылку, подпись и реакции агент не помечает, поэтому
 * селекторы их не проверяют. Вид — точным значением атрибута, а не подстрокой имени.
 */
const ROW = `[${MARK_KIND_ATTR}]`;
const STICKER_ROW = `[${MARK_KIND_ATTR}="sticker"]`;
const GIF_ROW = `[${MARK_KIND_ATTR}="gif"]`;

const BUBBLE = '[data-amo-bubble]';
const PHOTO_BOX = MARK_BOX_SELECTOR;
const STICKER_BOX = `${STICKER_ROW} ${PHOTO_BOX}`;
const SHOWN_PHOTO = 'img[data-media-photo="shown"]';

/**
 * Цитата ответа — с `data-quote-id`: просто `.amo-quote` ещё и у превью ссылки.
 */
const QUOTE = '.amo-quote[data-quote-id]';

/**
 * Плашка — блок цитаты в пузыре, обёртка `.amo-quote` со своими полями: вынесенная одна цитата
 * оставила бы обёртку в потоке, и картинка сдвинулась бы на её поля. В субъекте `:has()` — класс
 * блока, а не голый `div`: иначе `:has()` проверялся бы у каждого `div` ленты.
 */
const QUOTE_BLOCK = `${BUBBLE} > .pt-1:has(> ${QUOTE})`;

/**
 * Рамки пузыря — узлы, нажатие по которым не выделяет сообщение: первым ребёнком пузыря идёт
 * строка имени автора, после содержимого — полоса панели действий при наведении.
 */
const BUBBLE_FRAME = '[data-amo-bubble-frame]';

/**
 * Признаки по содержимому строки — `:has()` на самой помеченной строке: атрибут в субъекте
 * отсекает чужие строки одной проверкой, и `:has()` не проверяется у каждого `div` ленты. Они
 * нужны только плашке цитаты: ответ, направление и колонка аватара в ряду (узел перед окном
 * хвоста, своего или чужого).
 *
 * Приставки `outgoing` и `withAvatar` начинаются с атрибута строки, а не с `:has()`: правило,
 * составной селектор которого начинается с `:has()`, при прокрутке ленты пересчитывало стиль у
 * десятков тысяч узлов страницы, а не у тысяч.
 */
const WITH_REPLY = `:has(${BUBBLE} > .pt-1 > ${QUOTE})`;
const OUTGOING = `:has(${BUBBLE}.amo-bubble-out)`;
const WITH_AVATAR =
  ':has([data-amo-feed-row] > div > div[data-amo-tail]:not(:first-child))';

/**
 * Над картинкой шапка — имя автора или цитата: страница опускает под ней обёртку картинки на
 * 8 px, а без шапки поднимает на 7 px в поле пузыря.
 */
const WITH_HEAD = `:has(${BUBBLE} > ${BUBBLE_FRAME}:first-child, ${BUBBLE} > .pt-1 > ${QUOTE})`;
const HEAD_GAP_PX = 8;
const MEDIA_BLEED_PX = 7;

/**
 * Поле пузыря — 8 px, картинка выходит в него на 7 px: от края пузыря до картинки 1 px. Слота
 * чекбокса у края ряда вне режима выбора нет.
 */
const QUOTE_SPACING: QuoteSpacing = {
  mediaInsetPx: 1,
  mediaBleedPx: MEDIA_BLEED_PX,
  rowEdgePx: 0,
};

/**
 * Плашка — из переменных пузыря страницы: они уже несут текущую тему и направление, и своих
 * правил под тёмную тему не нужно.
 */
const QUOTE_SURFACE: QuoteSurface = {
  incoming:
    'linear-gradient(to top, var(--amo-color-bubble-in-from), var(--amo-color-bubble-in-to))',
  outgoing:
    'linear-gradient(to top, var(--amo-color-bubble-out-from), var(--amo-color-bubble-out-to))',
  dark: null,
  radius: 'var(--amo-radius-lgx)',
  shadow: 'var(--amo-shadow-flat)',
};

/**
 * Хвост — окно `div[data-amo-tail]` рядом с пузырём, а не строка `[data-amo-feed-row]`: у
 * последней строки пачки тот же атрибут.
 *
 * Заглушка — размытое превью страницы под картинкой. Она снимается в кадре, где картинка показана
 * (`data-media-photo="shown"`, страница ставит его раскодированной картинке): у прозрачного стикера
 * заглушка была бы видна сквозь него, а снятая до показа — оставила бы пустое место, пока картинка
 * скачивается, и кадр без картинки при входе в чат. `:has()` — у коробки медиа после её атрибутов:
 * он проверяется только у родителя заглушки в своей строке.
 */
const MESSAGE: MessageSelectors = {
  bubble: `${ROW} ${BUBBLE}`,
  tail: `${ROW} [data-amo-feed-row] div[data-amo-tail]`,
  backdrop: `${ROW} ${PHOTO_BOX}:has(> ${SHOWN_PHOTO}) > img[data-media-preview]`,
  author: `${ROW} ${BUBBLE} > ${BUBBLE_FRAME}:first-child`,
  image: `${ROW} ${PHOTO_BOX} > img[data-media-photo]`,
  stickerButton: STICKER_BOX,
  stickerSizing: {
    by: 'vars',
    box: STICKER_BOX,
    boxWidth: `${STICKER_BOX} > span`,
    widthVar: MARK_WIDTH_VAR,
    heightVar: MARK_HEIGHT_VAR,
  },
  stickerSpinnerLayer: `${STICKER_BOX} > [data-media-uploading]`,
  headedMedia: {
    selector: `${ROW}${WITH_HEAD} ${PHOTO_BOX}`,
    shiftPx: HEAD_GAP_PX + MEDIA_BLEED_PX,
  },
  quote: `${ROW} ${QUOTE_BLOCK}`,
  stickerQuote: `${STICKER_ROW} ${QUOTE_BLOCK}`,
  gifQuote: `${GIF_ROW} ${QUOTE_BLOCK}`,
  quoteSurface: QUOTE_SURFACE,
  quoteSpacing: QUOTE_SPACING,
  replyRow: `${ROW}${WITH_REPLY} > [data-amo-feed-row]`,
  replyControls: `${ROW}${WITH_REPLY} ${BUBBLE} > ${BUBBLE_FRAME}:not(:first-child)`,
  outgoing: `${ROW}${OUTGOING}`,
  withAvatar: `${ROW}${WITH_AVATAR}`,
};

export const workerMarkup: AmoMarkup = {
  ...compose,
  findComposers,
  button: WORKER_BUTTON,
  pageSelector: `${CAPSULE_TOP_SELECTOR}, ${ROW}`,
  message: MESSAGE,
};
