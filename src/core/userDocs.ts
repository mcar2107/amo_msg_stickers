import type { Locale } from './i18n';
import type { UserDocsPage } from './userDocs.types';

/**
 * Сайт доки на GitHub Pages проекта. Путь совпадает с `base` в `docs/.vitepress/config.mts` —
 * их сверяет тест.
 */
export const USER_DOCS_URL = 'https://mcar2107.github.io/amo_msg_stickers/';

/**
 * Страницы, на которые ссылается интерфейс, — пути исходников в `docs/content/` без `.md`: сайт
 * собран с `cleanUrls`, и адрес страницы — база, префикс языка и этот путь.
 */
export const USER_DOCS_PAGE = {
  gifKeys: 'setup/gif-keys',
  telegram: 'setup/telegram',
} as const;

/**
 * Префикс страниц доки на каждом языке интерфейса: русская — корень сайта, английская — локаль
 * `en` VitePress (`link: '/en/'` в `docs/.vitepress/config.mts`, сверяет тест). `Record` по
 * `Locale` не даёт добавить язык интерфейса без префикса его доки.
 */
const LOCALE_PREFIX: Readonly<Record<Locale, string>> = {
  ru: '',
  en: 'en/',
};

/**
 * Язык — параметр, а не текущий язык модуля `translate.ts`: адрес зовётся в рендере с
 * `getLocale()`, как `t`, — константа модуля застыла бы на русском до `setLocale` в `start()`.
 *
 * @param page — страница доки
 * @param locale — язык интерфейса: ссылка ведёт на доку на нём же
 * @returns полный адрес страницы
 */
export const userDocsUrl = (page: UserDocsPage, locale: Locale): string => {
  return `${USER_DOCS_URL}${LOCALE_PREFIX[locale]}${page}`;
};
