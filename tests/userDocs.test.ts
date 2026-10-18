import { describe, expect, it } from 'vitest';

import { USER_DOCS_PAGE, USER_DOCS_URL, userDocsUrl } from '@core/userDocs';

/**
 * Файл — `config.mts`, а путь — с `.mjs`: TypeScript находит по нему исходник `.mts`, а путь
 * с `.mts` требует `allowImportingTsExtensions`.
 */
import docsConfig from '../docs/.vitepress/config.mjs';
import docsConfigSource from '../docs/.vitepress/config.mts?raw';

/**
 * База сайта в конфиге VitePress: адрес сайта на Pages — хост плюс эта база. Литерал
 * лежит в константе `BASE`: её берут и `base`, и ссылки `head`.
 */
const BASE_PATTERN = /\bconst BASE\s*=\s*'([^']+)'/;

const PAGES = Object.values(USER_DOCS_PAGE);

/**
 * Каталоги исходников страниц по языкам внутри `docs/content/` — литералами, а не из модуля:
 * тест сверяет модуль с реальным расположением файлов.
 */
const SOURCE_DIRS = [
  ['ru', ''],
  ['en', 'en/'],
] as const;

describe('userDocs', () => {
  it('база адреса совпадает с base сайта доки', () => {
    const base = BASE_PATTERN.exec(docsConfigSource)?.[1];

    expect(base).toBeDefined();
    expect(docsConfigSource).toMatch(/\bbase:\s*BASE\b/);
    expect(new URL(USER_DOCS_URL).pathname).toBe(base);
  });

  it('база адреса — https, со слешем в конце', () => {
    const { protocol } = new URL(USER_DOCS_URL);

    expect(protocol).toBe('https:');
    expect(USER_DOCS_URL.endsWith('/')).toBe(true);
  });

  it('модуль ссылается хотя бы на одну страницу', () => {
    expect(PAGES.length).toBeGreaterThan(0);
  });

  describe.each(SOURCE_DIRS)('язык %s', (_locale, dir) => {
    it.each(PAGES)('у страницы %s есть исходник в docs/content/', async (page) => {
      /**
       * Импорт с `?raw` падает, если файла нет: переименование страницы доки или пропуск
       * перевода без правки ядра ломает тест, а не ссылку у пользователя.
       *
       * Адрес собирается в переменной с `@vite-ignore`: шаблон в самом `import()` vite
       * разбирает статически и разрешает переменную только на один уровень каталога, а
       * страницы лежат глубже.
       */
      const specifier = `../docs/content/${dir}${page}.md?raw`;
      const { default: source } = await import(/* @vite-ignore */ specifier);

      expect(source.length).toBeGreaterThan(0);
    });
  });

  it('русские адреса — от корня сайта', () => {
    expect(userDocsUrl(USER_DOCS_PAGE.gifKeys, 'ru')).toBe(
      'https://mcar2107.github.io/amo_msg_stickers/setup/gif-keys'
    );
    expect(userDocsUrl(USER_DOCS_PAGE.telegram, 'ru')).toBe(
      'https://mcar2107.github.io/amo_msg_stickers/setup/telegram'
    );
  });

  it('английские адреса — под /en/', () => {
    expect(userDocsUrl(USER_DOCS_PAGE.gifKeys, 'en')).toBe(
      'https://mcar2107.github.io/amo_msg_stickers/en/setup/gif-keys'
    );
    expect(userDocsUrl(USER_DOCS_PAGE.telegram, 'en')).toBe(
      'https://mcar2107.github.io/amo_msg_stickers/en/setup/telegram'
    );
  });

  it('префикс английских адресов совпадает с link локали en в конфиге VitePress', () => {
    const base = BASE_PATTERN.exec(docsConfigSource)?.[1] || '';
    /**
     * `link` берётся из самого конфига, а не разбором исходника: порядок полей в объекте
     * локали тогда не важен.
     */
    const link = docsConfig.locales?.en?.link;

    expect(link).toBe('/en/');

    for (const page of PAGES) {
      expect(new URL(userDocsUrl(page, 'en')).pathname).toBe(
        `${base}${link?.slice(1)}${page}`
      );
    }
  });
});
