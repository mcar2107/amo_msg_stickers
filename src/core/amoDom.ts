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
  SendButton,
  SendComposer,
  ThemeSignals,
} from './amoDom.types';
import { legacyMarkup } from './amoDomLegacy';
import { stableMarkup } from './amoDomStable';
import { messageCss } from './amoDomStyle';
import { workerMarkup } from './amoDomWorker';

const MARKUPS: AmoMarkup[] = [stableMarkup, legacyMarkup, workerMarkup];

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
 * CSS своих сообщений по разметкам — в порядке `MARKUPS`.
 *
 * @param markups — разметки, чьи правила нужны
 * @returns текст листа стиля
 */
const messageStyleOf = (markups: AmoMarkup[]) => {
  return MARKUPS.reduce<string[]>((acc, markup) => {
    if (markups.includes(markup)) acc.push(messageCss(markup.message));

    return acc;
  }, []).join('\n');
};

/**
 * Разметки страницы, опознанной по узлам разметки. Стабильная и прежняя — сборки одной amo web,
 * и правила обеих остаются вместе; Worker-версия — другое приложение, и правил других разметок на
 * её странице нет.
 *
 * @returns разметки, чьи правила нужны странице; null — страница ещё не опознана
 */
const pageMarkupsOf = (): AmoMarkup[] | null => {
  const found = MARKUPS.find(({ pageSelector }) => {
    return document.querySelector(pageSelector);
  });

  if (!found) return null;

  return found === workerMarkup ? [workerMarkup] : [stableMarkup, legacyMarkup];
};

/**
 * Опознана ли страница — после этого лист стиля не меняется.
 */
let isPageKnown = false;

/**
 * Лист стиля несёт правила только разметок страницы: правила чужой разметки не совпадают ни с
 * одним сообщением, но браузер проверяет их на каждом пересчёте стиля — правила прежней разметки
 * с `:has()` у `div` в Worker-версии пересчитывали стиль у сотен узлов на открытии чата,
 * прокрутке и наборе, и след их проверки оставался на узлах после замены листа.
 *
 * Пока страница не опознана, в листе — правила Worker-версии: они узнают только строки, помеченные
 * агентом, и на странице amo web ничего не задевают. Узлы стабильной или прежней разметки
 * опознают страницу в той же пачке мутаций, где появились, — до отрисовки сообщения.
 *
 * @param style — лист стиля своих сообщений
 */
const syncPageStyle = (style: HTMLElement) => {
  const markups = pageMarkupsOf();

  if (!markups) return;
  isPageKnown = true;

  if (markups.includes(workerMarkup)) return;
  style.textContent = messageStyleOf(markups);
};

/**
 * Стиль своих сообщений — один глобальный `<style>` в документе amo: CSS сам применяется к
 * сообщениям, которые появятся в ленте позже, без слежения за её DOM. Повторный вызов ничего не
 * делает.
 */
export const injectMessageStyle = () => {
  if (document.getElementById(MESSAGE_STYLE_ID)) return;
  const style = document.createElement('style');

  style.id = MESSAGE_STYLE_ID;
  style.textContent = messageStyleOf([workerMarkup]);
  syncPageStyle(style);
  document.head.append(style);
};

/**
 * Опознание страницы по новым узлам — синхронно в колбэке наблюдателя мутаций, до отрисовки
 * пачки. Опознанная страница больше ничего не проверяет.
 */
export const syncMessageStyle = () => {
  if (isPageKnown) return;
  const style = document.getElementById(MESSAGE_STYLE_ID);

  if (style) syncPageStyle(style);
};
