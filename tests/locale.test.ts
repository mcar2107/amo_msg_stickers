import { afterEach, describe, expect, it, vi } from 'vitest';

import { AMO_LOCALE_KEY, readAmoLocale, resolveLocale } from '../src/core/i18n/locale';

/**
 * @param getItem — чтение хранилища страницы
 * @param languages — языки браузера
 * @param language — основной язык браузера
 */
const stubPage = (
  getItem: (key: string) => string | null,
  languages: readonly string[],
  language = ''
) => {
  vi.stubGlobal('localStorage', { getItem });
  vi.stubGlobal('navigator', { languages, language });
};

describe('resolveLocale', () => {
  it.each(['en-US', 'EN', 'en_GB', 'en'])('%s → en', (tag) => {
    expect(resolveLocale(tag, '', [])).toBe('en');
    expect(resolveLocale(null, tag, [])).toBe('en');
    expect(resolveLocale(null, '', [tag])).toBe('en');
  });

  it.each(['ru-RU', 'de-DE', ''])('%s → ru', (tag) => {
    expect(resolveLocale(tag, '', [])).toBe('ru');
    expect(resolveLocale(null, tag, [])).toBe('ru');
  });

  it('без сохранённого языка и языков браузера → ru', () => {
    expect(resolveLocale(null, '', [])).toBe('ru');
    expect(resolveLocale('', '', [])).toBe('ru');
  });

  it('сохранённый язык важнее языка документа и языков браузера', () => {
    expect(resolveLocale('en', 'ru', ['ru-RU'])).toBe('en');
    expect(resolveLocale('ru', 'en', ['en-US'])).toBe('ru');
  });

  it('без сохранённого языка язык документа важнее языков браузера', () => {
    expect(resolveLocale(null, 'en', ['de-DE', 'ru-RU'])).toBe('en');
    expect(resolveLocale(null, 'ru', ['en-US'])).toBe('ru');
  });

  it('язык документа без перевода → ru, языки браузера не спрашиваются', () => {
    expect(resolveLocale(null, 'de', ['en'])).toBe('ru');
  });

  it('пустой сохранённый язык и язык документа → первый язык браузера', () => {
    expect(resolveLocale('', '', ['en-US', 'ru-RU'])).toBe('en');
    expect(resolveLocale(null, '', ['ru-RU', 'en-US'])).toBe('ru');
  });
});

/**
 * Документ страницы без DOM: `readAmoLocale` читает у него только `lang` корня.
 *
 * @param lang — `lang` у `<html>`; пустая строка — атрибута нет
 * @returns срез документа
 */
const pageDocument = (lang = '') => {
  return { documentElement: { lang } };
};

describe('readAmoLocale', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('читает язык amo из localStorage по ключу i18nextLng', () => {
    const getItem = vi.fn((key: string) => {
      return key === AMO_LOCALE_KEY ? 'en' : null;
    });

    stubPage(getItem, ['ru-RU']);

    expect(readAmoLocale(pageDocument())).toBe('en');
    expect(getItem).toHaveBeenCalledWith('i18nextLng');
  });

  it('без значения в localStorage берёт язык документа', () => {
    stubPage(() => {
      return null;
    }, ['de-DE', 'en-US']);

    expect(readAmoLocale(pageDocument('en'))).toBe('en');
    expect(readAmoLocale(pageDocument('ru'))).toBe('ru');
  });

  it('язык документа без перевода — русский, даже если браузер на английском', () => {
    stubPage(() => {
      return null;
    }, ['en']);

    expect(readAmoLocale(pageDocument('de'))).toBe('ru');
  });

  it('значение в localStorage важнее языка документа', () => {
    stubPage(() => {
      return 'en';
    }, ['ru-RU']);

    expect(readAmoLocale(pageDocument('ru'))).toBe('en');
  });

  it('при бросающем localStorage берёт язык документа', () => {
    stubPage(() => {
      throw new Error('SecurityError');
    }, ['ru-RU']);

    expect(readAmoLocale(pageDocument('en-US'))).toBe('en');
  });

  it('без значения в localStorage и языка документа берёт navigator.languages', () => {
    stubPage(() => {
      return null;
    }, ['en-GB']);

    expect(readAmoLocale(pageDocument())).toBe('en');
  });

  it('при бросающем localStorage берёт navigator.languages', () => {
    stubPage(() => {
      throw new Error('SecurityError');
    }, ['en-GB']);

    expect(readAmoLocale(pageDocument())).toBe('en');
  });

  it('при пустых navigator.languages берёт navigator.language', () => {
    stubPage(
      () => {
        return null;
      },
      [],
      'en-US'
    );

    expect(readAmoLocale(pageDocument())).toBe('en');
  });
});
