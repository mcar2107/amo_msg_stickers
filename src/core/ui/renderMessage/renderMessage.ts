import type { ComponentChild } from 'preact';

import type { MessageKey } from '@core/i18n';
import { messageTemplate, PLACEHOLDER } from '@core/i18n';

import type { MessageNodes, TemplateNodes } from './renderMessage.types';

/**
 * Текст склеивается с соседним текстом: строка без узлов остаётся одним текстовым узлом.
 *
 * @param children — уже собранные узлы, дополняются на месте
 * @param text — кусок текста
 */
const pushText = (children: ComponentChild[], text: string) => {
  if (!text) return;

  const last = children.at(-1);

  if (typeof last === 'string') {
    children[children.length - 1] = last + text;

    return;
  }

  children.push(text);
};

/**
 * Подстановка без узла остаётся в тексте как есть — пропуск виден в интерфейсе, как у `t`. Группа
 * захвата `PLACEHOLDER` оставляет имя подстановки в результате `split`: куски текста стоят на чётных
 * местах, имена — на нечётных.
 *
 * @param template — строка с подстановками `{name}`
 * @param nodes — узлы подстановок
 * @returns узлы строки по порядку: текст и узлы подстановок на своих местах
 */
export const renderTemplate = (template: string, nodes: TemplateNodes) => {
  return template.split(PLACEHOLDER).reduce<ComponentChild[]>((children, part, index) => {
    const isName = index % 2 === 1;

    if (isName && Object.hasOwn(nodes, part)) {
      children.push(nodes[part]);
    } else {
      pushText(children, isName ? `{${part}}` : part);
    }

    return children;
  }, []);
};

/**
 * Строка словаря с элементом внутри — ссылкой в тексте подсказки. Фраза остаётся одним ключом: порядок
 * слов вокруг узла задаёт перевод, а не компонент.
 *
 * @param key — ключ словаря
 * @param nodes — узлы подстановок строки
 * @returns узлы строки на текущем языке
 */
export const renderMessage = <K extends MessageKey>(key: K, nodes: MessageNodes<K>) => {
  return renderTemplate(messageTemplate(key), nodes);
};
