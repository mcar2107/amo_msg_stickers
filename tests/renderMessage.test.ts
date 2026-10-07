import { h } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';

import { EN } from '../src/core/i18n/messages.en';
import { RU } from '../src/core/i18n/messages.ru';
import { setLocale } from '../src/core/i18n/translate';
import {
  renderMessage,
  renderTemplate,
} from '../src/core/ui/renderMessage/renderMessage';

const LINK = h('a', { href: 'https://giphy.com' }, 'GIPHY');
const DOCS = h('a', { href: 'https://example.com/setup/telegram' }, 'docs');

afterEach(() => {
  setLocale('ru');
});

describe('renderTemplate', () => {
  it('строка без подстановок — один текстовый узел', () => {
    expect(renderTemplate('Стикеры и GIF', {})).toEqual(['Стикеры и GIF']);
  });

  it('{link} в начале — узел первым, текст после него сохранён', () => {
    expect(renderTemplate('{link} — бесплатно', { link: LINK })).toEqual([
      LINK,
      ' — бесплатно',
    ]);
  });

  it('{link} в середине — узел между двумя кусками текста', () => {
    expect(
      renderTemplate('Создайте бота в {link}. Токен хранится локально.', { link: LINK })
    ).toEqual(['Создайте бота в ', LINK, '. Токен хранится локально.']);
  });

  it('{link} в конце — узел последним, текст до него сохранён', () => {
    expect(renderTemplate('Бесплатно на {link}', { link: LINK })).toEqual([
      'Бесплатно на ',
      LINK,
    ]);
  });

  it('узел встаёт тем же объектом, а не копией', () => {
    const [, node] = renderTemplate('на {link}', { link: LINK });

    expect(node).toBe(LINK);
  });

  it('подстановка без узла остаётся в тексте и не рвёт его на куски', () => {
    expect(renderTemplate('до {name} после', {})).toEqual(['до {name} после']);
  });
});

describe('renderMessage', () => {
  it('берёт строку текущего языка', () => {
    expect(renderMessage('picker.title', {})).toEqual([RU['picker.title']]);

    setLocale('en');

    expect(renderMessage('picker.title', {})).toEqual([EN['picker.title']]);
  });

  it('ставит узлы ссылок на места подстановок в строке каждого языка', () => {
    expect(renderMessage('settings.telegram.hint', { link: LINK, docs: DOCS })).toEqual([
      'Создайте любого бота в\u00a0',
      LINK,
      '. ',
      DOCS,
    ]);

    setLocale('en');

    expect(renderMessage('settings.telegram.hint', { link: LINK, docs: DOCS })).toEqual([
      'Create any bot in\u00a0',
      LINK,
      '. ',
      DOCS,
    ]);
  });
});
