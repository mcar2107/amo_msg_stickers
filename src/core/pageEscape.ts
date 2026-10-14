import type { EscapeKeyEvent } from './pageEscape.types';

/**
 * Escape страницы — нажатый вне пикера и его предпросмотра: в поле ввода после открытия наведением или на странице
 * после открытия кликом. Пока пикер открыт, такой Escape закрывает только пикер, как попап эмодзи amo, — иначе он
 * дошёл бы до страницы, и amo закрыл бы чат. Escape внутри панели и предпросмотра остаётся их обработчикам: меню,
 * предпросмотр и попап закрываются по очереди. Escape набора IME отменяет набор и пикер не закрывает.
 *
 * @param event — нажатие клавиши
 * @param insiders — узлы пикера в пути события: кнопка с панелью и слой предпросмотра
 * @returns true — Escape страницы
 */
export const isPageEscape = (event: EscapeKeyEvent, insiders: readonly object[]) => {
  if (event.key !== 'Escape' || event.isComposing) return false;

  return !event.composedPath().some((node) => {
    return insiders.includes(node);
  });
};
