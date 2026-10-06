import { afterEach, describe, expect, it } from 'vitest';

import { EN } from '../src/core/i18n/messages.en';
import { RU } from '../src/core/i18n/messages.ru';
import {
  formatMessage,
  getLocale,
  LocalizedError,
  messageTemplate,
  setLocale,
  t,
} from '../src/core/i18n/translate';

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * @param template — строка словаря
 * @returns имена подстановок строки по алфавиту
 */
const placeholdersOf = (template: string) => {
  return Array.from(template.matchAll(PLACEHOLDER), ([, name]) => {
    return name;
  }).sort();
};

/**
 * Английский словарь как запись по строке: ключи RU приходят из `Object.entries` строками.
 */
const EN_TEXTS: Readonly<Record<string, string>> = EN;

afterEach(() => {
  setLocale('ru');
});

describe('formatMessage', () => {
  it('подставляет несколько параметров, в том числе повторы и числа', () => {
    expect(
      formatMessage('{name}: {size} МБ, снова {name}', { name: 'cat', size: 0 })
    ).toBe('cat: 0 МБ, снова cat');
  });

  it('без параметров возвращает строку как есть', () => {
    expect(formatMessage('Стикеры и GIF')).toBe('Стикеры и GIF');
  });

  it('оставляет подстановку, для которой нет параметра', () => {
    expect(formatMessage('Бесплатно на {link}', {})).toBe('Бесплатно на {link}');
  });
});

describe('язык модуля', () => {
  it('по умолчанию — русский', () => {
    expect(getLocale()).toBe('ru');
    expect(t('picker.title')).toBe(RU['picker.title']);
  });

  it('после setLocale("en") — английский', () => {
    setLocale('en');

    expect(getLocale()).toBe('en');
    expect(t('picker.title')).toBe(EN['picker.title']);
    expect(t('picker.title')).not.toBe(RU['picker.title']);
  });

  it('подставляет параметры в строку текущего языка', () => {
    expect(t('settings.giphy.hint', { link: 'giphy.com', docs: 'doc' })).toBe(
      'Бесплатно на\u00a0giphy.com. doc'
    );

    setLocale('en');

    expect(t('settings.giphy.hint', { link: 'giphy.com', docs: 'doc' })).toBe(
      'Free at\u00a0giphy.com. doc'
    );
  });
});

describe('messageTemplate', () => {
  it('отдаёт шаблон текущего языка без подстановки', () => {
    expect(messageTemplate('settings.giphy.hint')).toBe(
      'Бесплатно на\u00a0{link}. {docs}'
    );

    setLocale('en');

    expect(messageTemplate('settings.giphy.hint')).toBe('Free at\u00a0{link}. {docs}');
  });
});

describe('status.importProgress', () => {
  it('название пака в кавычках языка, счётчик как есть', () => {
    const params = { title: 'Cats', done: 3, total: 12 };

    expect(t('status.importProgress', params)).toBe('«Cats»: 3/12');

    setLocale('en');

    expect(t('status.importProgress', params)).toBe('“Cats”: 3/12');
  });
});

describe('строки экранов', () => {
  it('отказ ключа называет источник на обоих языках', () => {
    expect(t('settings.check.rejected', { source: 'GIPHY' })).toBe(
      'GIPHY не принял ключ'
    );

    setLocale('en');

    expect(t('settings.check.rejected', { source: 'GIPHY' })).toBe(
      'GIPHY rejected the key'
    );
  });

  it('ссылки на доку — «Инструкция» без языка инструкции', () => {
    expect([t('settings.docs'), t('add.telegram.docs')]).toEqual([
      'Инструкция',
      'Инструкция',
    ]);

    setLocale('en');

    expect([t('settings.docs'), t('add.telegram.docs')]).toEqual([
      'Instructions',
      'Instructions',
    ]);
  });

  it('подсказки токена не говорят о хранении: это строка экрана', () => {
    expect(t('settings.storedLocally')).toBe(
      'Ключи и токен хранятся только в этом браузере.'
    );
    expect(messageTemplate('settings.telegram.hint')).not.toContain('локально');
    expect(messageTemplate('settings.telegram.hintOptional')).not.toContain('локально');
  });
});

describe('LocalizedError', () => {
  it('сохраняет ключ, параметры и текст на текущем языке', () => {
    setLocale('en');
    const error = new LocalizedError('picker.title');

    expect(error).toBeInstanceOf(Error);
    expect(error.key).toBe('picker.title');
    expect(error.params).toBeUndefined();
    expect(error.message).toBe(EN['picker.title']);
  });

  it('сохраняет непустые параметры и подставляет их в текст', () => {
    setLocale('en');
    const error = new LocalizedError('settings.giphy.hint', {
      link: 'giphy.com',
      docs: 'doc',
    });

    expect(error.key).toBe('settings.giphy.hint');
    expect(error.params).toEqual({ link: 'giphy.com', docs: 'doc' });
    expect(error.message).toBe('Free at\u00a0giphy.com. doc');
  });

  it('текст фиксируется при создании', () => {
    const error = new LocalizedError('picker.title');

    setLocale('en');

    expect(error.message).toBe(RU['picker.title']);
  });
});

describe('словари', () => {
  it('у EN те же ключи, что у RU', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(RU).sort());
  });

  it.each(Object.entries(RU))('%s: набор подстановок EN равен RU', (key, text) => {
    expect(placeholdersOf(EN_TEXTS[key] || '')).toEqual(placeholdersOf(text));
  });
});
