/**
 * Разметка Worker-версии amo web — поле ввода `[contenteditable][role="textbox"]` без
 * стабильных атрибутов и без `aria-placeholder`, в капсуле с маркером `[data-capsule-top]`.
 *
 * «Отправить» страница монтирует только при непустом черновике, а отмена правки уходит из DOM
 * анимацией, поэтому черновик читается от капсулы в момент вызова, а не по кнопкам, найденным
 * вместе с полем.
 */

import type {
  ButtonMarkup,
  ComposeMarkup,
  Composer,
  ComposerMarkup,
} from './amoDom.types';
import { STABLE_COMPOSE_INPUT_ATTR } from './amoDomStable';

const EDITABLE_SELECTOR = `[contenteditable][role="textbox"]:not([${STABLE_COMPOSE_INPUT_ATTR}]):not([aria-placeholder])`;

/**
 * Капсула поля — ближайший предок поля с маркером верха капсулы: маркер рендерится всегда, в
 * отличие от кнопки файла, которой нет при вложениях и при правке.
 */
const CAPSULE_SELECTOR = ':has([data-capsule-top])';
const EMOJI_SELECTOR = ':scope > button[aria-haspopup="dialog"]';
const CANCEL_EDIT_SELECTOR = ':scope > [data-compose-edit-cancel]';
const EDITING_ATTR = 'data-editing';
const ATTACHMENTS_SELECTOR = '[data-attachments]';

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

export const workerMarkup: ComposerMarkup = {
  ...compose,
  findComposers,
  button: WORKER_BUTTON,
};
