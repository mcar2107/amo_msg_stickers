/**
 * Фасад DOM amo web для ядра: поле ввода, его черновик, тема и стиль своих сообщений.
 *
 * Страница amo бывает в двух разметках — стабильной, с атрибутами `data-*` (`amoDomStable.ts`), и
 * прежней, по классам и структуре (`amoDomLegacy.ts`). Ядро не знает, какая из них на странице:
 * фасад спрашивает обе, а разметки друг с другом не пересекаются.
 */

import type { AmoMarkup, Composer, SendButton, SendComposer } from './amoDom.types';
import { legacyMarkup } from './amoDomLegacy';
import { stableMarkup } from './amoDomStable';
import { messageCss } from './amoDomStyle';

const MARKUPS: AmoMarkup[] = [stableMarkup, legacyMarkup];

export const findComposers = (root: ParentNode = document): Composer[] => {
  return MARKUPS.flatMap((markup) => {
    return markup.findComposers(root);
  });
};

export const composerOf = (el: Element): Composer | null => {
  return (
    findComposers().find(({ row }) => {
      return row.contains(el);
    }) || null
  );
};

/**
 * Идёт ли редактирование — признаком разметки поля, в момент вызова.
 *
 * @param composer — поле ввода
 * @returns true — редактируется отправленное сообщение
 */
export const isEditing = (composer: SendComposer) => {
  return composer.markup.isEditing(composer);
};

/**
 * Пуст ли черновик — признаком разметки поля, в момент вызова.
 *
 * @param composer — поле ввода
 * @returns true — в поле нет ни текста, ни вложений
 */
export const isDraftEmpty = (composer: SendComposer) => {
  return composer.markup.isDraftEmpty(composer);
};

/**
 * Кнопка «Отправить», которую можно нажать сейчас, — признаком разметки поля.
 *
 * @param composer — поле ввода
 * @returns кнопка; null — её нет или она скрыта
 */
export const sendButtonOf = (composer: SendComposer): SendButton | null => {
  return composer.markup.sendButtonOf(composer);
};

export const isDarkTheme = () => {
  return document.documentElement.classList.contains('dark');
};

const MESSAGE_STYLE_ID = 'amo-stickers-message';

/**
 * Стиль своих сообщений — один глобальный `<style>` в документе amo с правилами обеих разметок:
 * CSS сам применяется к сообщениям, которые появятся в ленте позже, без слежения за её DOM, а
 * срабатывают правила той разметки, что на странице. Повторный вызов ничего не делает.
 */
export const injectMessageStyle = () => {
  if (document.getElementById(MESSAGE_STYLE_ID)) return;
  const style = document.createElement('style');

  style.id = MESSAGE_STYLE_ID;
  style.textContent = MARKUPS.map(({ message }) => {
    return messageCss(message);
  }).join('\n');
  document.head.append(style);
};
