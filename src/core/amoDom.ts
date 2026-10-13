/**
 * Фасад DOM amo web для ядра: поле ввода, его черновик, тема и стиль своих сообщений.
 *
 * Страница amo бывает в трёх разметках — стабильной, с атрибутами `data-*` (`amoDomStable.ts`),
 * прежней, по классам и структуре (`amoDomLegacy.ts`), и разметке Worker-версии
 * (`amoDomWorker.ts`). Ядро не знает, какая из них на странице: фасад спрашивает все, а разметки
 * друг с другом не пересекаются.
 */

import type {
  AmoMarkup,
  Composer,
  ComposerMarkup,
  SendButton,
  SendComposer,
  ThemeSignals,
} from './amoDom.types';
import { legacyMarkup } from './amoDomLegacy';
import { stableMarkup } from './amoDomStable';
import { messageCss } from './amoDomStyle';
import { workerMarkup } from './amoDomWorker';

/**
 * Разметки со стилем ленты: Worker-версия поле ввода находит, а стиля ленты у неё нет.
 */
const STYLED_MARKUPS: AmoMarkup[] = [stableMarkup, legacyMarkup];
const COMPOSER_MARKUPS: ComposerMarkup[] = [...STYLED_MARKUPS, workerMarkup];

export const findComposers = (root: ParentNode = document): Composer[] => {
  return COMPOSER_MARKUPS.flatMap((markup) => {
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

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/**
 * Тема по признакам страницы: класс `dark`, затем `data-amo-theme`, затем системная тема — только
 * при поле Worker-версии. У прежней amo в светлой теме нет ни класса, ни атрибута, и системная
 * тёмная перекрасила бы пикер в чужую тему.
 *
 * @param signals — признаки темы страницы
 * @returns true — тёмная тема
 */
export const resolveDarkTheme = (signals: ThemeSignals) => {
  const { hasDarkClass, themeAttr, hasWorkerComposer, isSystemDark } = signals;

  if (hasDarkClass) return true;

  switch (themeAttr) {
    case 'dark': {
      return true;
    }

    case 'light': {
      return false;
    }

    default: {
      return hasWorkerComposer && isSystemDark;
    }
  }
};

export const isDarkTheme = () => {
  const root = document.documentElement;

  return resolveDarkTheme({
    hasDarkClass: root.classList.contains('dark'),
    themeAttr: root.getAttribute('data-amo-theme'),
    hasWorkerComposer: workerMarkup.findComposers(document).length > 0,
    isSystemDark: matchMedia(DARK_SCHEME_QUERY).matches,
  });
};

/**
 * Подписка на смену системной темы: тема Worker-версии без явного выбора идёт за ней.
 *
 * @param onChange — колбэк на смену системной темы
 */
export const watchSystemTheme = (onChange: () => void) => {
  matchMedia(DARK_SCHEME_QUERY).addEventListener('change', onChange);
};

const MESSAGE_STYLE_ID = 'amo-stickers-message';

/**
 * Стиль своих сообщений — один глобальный `<style>` в документе amo с правилами всех разметок:
 * CSS сам применяется к сообщениям, которые появятся в ленте позже, без слежения за её DOM, а
 * срабатывают правила той разметки, что на странице. Повторный вызов ничего не делает.
 */
export const injectMessageStyle = () => {
  if (document.getElementById(MESSAGE_STYLE_ID)) return;
  const style = document.createElement('style');

  style.id = MESSAGE_STYLE_ID;
  style.textContent = STYLED_MARKUPS.map(({ message }) => {
    return messageCss(message);
  }).join('\n');
  document.head.append(style);
};
