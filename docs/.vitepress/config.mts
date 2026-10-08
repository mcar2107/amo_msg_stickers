import { defineConfig } from 'vitepress';
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs';

const REPO_URL = 'https://github.com/mcar2107/amo_msg_stickers';

/**
 * Сайт живёт на GitHub Pages проекта: адрес страницы — база плюс путь файла без `.md`.
 * База нужна и отдельно: ссылки в `head` VitePress не дополняет ею, в отличие от ссылок
 * страниц и логотипа.
 */
const BASE = '/amo_msg_stickers/';

/**
 * Конфиг сайта доки. VitePress читает только экспорт по умолчанию.
 *
 * Битые внутренние ссылки VitePress считает ошибкой сборки — это и есть проверка ссылок,
 * поэтому `ignoreDeadLinks` не задаётся.
 */
export default defineConfig({
  title: 'amo stickers',
  description: 'Стикеры и GIF для мессенджера amo',
  base: BASE,
  /**
   * Страницы — в `content/`, отдельно от пакета и конфига: в корне `docs/` лежат
   * `package.json`, lockfile и `node_modules`, и тексты среди них терялись бы.
   */
  srcDir: 'content',
  /**
   * `public/` — рядом с `content/`, а не внутри: там статика сайта (логотип), не страницы.
   * Vite считает путь от корня проекта, а корнем VitePress делает `srcDir`.
   */
  vite: {
    publicDir: '../public',
  },
  /**
   * Иконка вкладки — под тему системы: у браузера нет темы сайта, переключатель VitePress
   * до вкладки не доходит.
   *
   * `google-site-verification` подтверждает сайт в Google Search Console: без этого Chrome Web
   * Store не даёт выбрать его официальным сайтом расширения. Мета-тег нельзя убирать и после
   * подтверждения — Google перепроверяет его.
   */
  head: [
    [
      'meta',
      {
        name: 'google-site-verification',
        content: '_0GcT4tbg4ngK03cHgwp-Q1SUH9P6nRsrvEm3cDFL3c',
      },
    ],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}logo-light.svg` }],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: `${BASE}logo-dark.svg`,
        media: '(prefers-color-scheme: dark)',
      },
    ],
  ],
  lang: 'ru-RU',
  cleanUrls: true,
  /**
   * Общие фрагменты подключаются в страницы `@include`: без исключения каждый собрался бы
   * отдельной страницей со своим адресом и попал бы в поиск.
   */
  srcExclude: ['_parts/**'],
  /**
   * Русский — корень, английский — каталог `/en/` с теми же путями страниц: адреса русских
   * страниц от второго языка не меняются, а переключатель языка ведёт на ту же страницу
   * другой локали. Всё, что на языке, — меню и служебные подписи темы — живёт в локали,
   * общее — в `themeConfig` ниже.
   */
  locales: {
    root: {
      label: 'Русский',
      lang: 'ru-RU',
      themeConfig: {
        nav: [
          { text: 'Установка', link: '/install/' },
          { text: 'Как пользоваться', link: '/usage' },
          { text: 'Настройка', link: '/setup/gif-keys' },
          { text: 'Частые вопросы', link: '/faq' },
        ],
        sidebar: [
          {
            text: 'Установка',
            link: '/install/',
            items: [
              { text: 'Chrome, Edge, Яндекс Браузер, Opera', link: '/install/chromium' },
              { text: 'Firefox', link: '/install/firefox' },
              { text: 'Safari', link: '/install/safari' },
              { text: 'Приложение amo', link: '/install/desktop' },
            ],
          },
          { text: 'Как пользоваться', link: '/usage' },
          {
            text: 'Настройка',
            items: [
              { text: 'Ключи GIF', link: '/setup/gif-keys' },
              { text: 'Импорт из Telegram', link: '/setup/telegram' },
            ],
          },
          {
            text: 'Помощь',
            items: [
              { text: 'Обновление', link: '/update' },
              { text: 'Частые вопросы', link: '/faq' },
              { text: 'Политика конфиденциальности', link: '/privacy' },
            ],
          },
        ],
        outline: { label: 'На странице' },
        docFooter: { prev: 'Назад', next: 'Дальше' },
        darkModeSwitchLabel: 'Тема',
        lightModeSwitchTitle: 'Светлая тема',
        darkModeSwitchTitle: 'Тёмная тема',
        sidebarMenuLabel: 'Меню',
        returnToTopLabel: 'Наверх',
        skipToContentLabel: 'Перейти к содержимому',
        langMenuLabel: 'Язык',
        notFound: {
          title: 'Страница не найдена',
          quote: 'Такой страницы в доке нет — возможно, её переименовали.',
          linkText: 'На главную',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'amo stickers',
      description: 'Stickers and GIFs for the amo messenger',
      themeConfig: {
        nav: [
          { text: 'Installation', link: '/en/install/' },
          { text: 'How to use', link: '/en/usage' },
          { text: 'Setup', link: '/en/setup/gif-keys' },
          { text: 'FAQ', link: '/en/faq' },
        ],
        sidebar: [
          {
            text: 'Installation',
            link: '/en/install/',
            items: [
              {
                text: 'Chrome, Edge, Yandex Browser, Opera',
                link: '/en/install/chromium',
              },
              { text: 'Firefox', link: '/en/install/firefox' },
              { text: 'Safari', link: '/en/install/safari' },
              { text: 'amo app', link: '/en/install/desktop' },
            ],
          },
          { text: 'How to use', link: '/en/usage' },
          {
            text: 'Setup',
            items: [
              { text: 'GIF keys', link: '/en/setup/gif-keys' },
              { text: 'Import from Telegram', link: '/en/setup/telegram' },
            ],
          },
          {
            text: 'Help',
            items: [
              { text: 'Updating', link: '/en/update' },
              { text: 'FAQ', link: '/en/faq' },
              { text: 'Privacy policy', link: '/en/privacy' },
            ],
          },
        ],
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        darkModeSwitchLabel: 'Theme',
        lightModeSwitchTitle: 'Light theme',
        darkModeSwitchTitle: 'Dark theme',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Back to top',
        skipToContentLabel: 'Skip to content',
        langMenuLabel: 'Language',
        notFound: {
          title: 'Page not found',
          quote: 'There’s no such page in the docs — it may have been renamed.',
          linkText: 'Back to home',
        },
      },
    },
  },
  markdown: {
    config: (md) => {
      md.use(tabsMarkdownPlugin);
    },
  },
  themeConfig: {
    logo: { light: '/logo-light.svg', dark: '/logo-dark.svg', alt: '' },
    socialLinks: [{ icon: 'github', link: REPO_URL }],
    /**
     * Локальный поиск строит индекс на локаль: страницы одного языка не попадают в выдачу
     * другого. Подписи окна поиска — тоже на языке страницы.
     */
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Поиск',
                buttonAriaLabel: 'Поиск',
              },
              modal: {
                displayDetails: 'Подробный список',
                resetButtonTitle: 'Сбросить поиск',
                backButtonTitle: 'Закрыть поиск',
                noResultsText: 'Ничего не нашлось',
                footer: {
                  selectText: 'выбрать',
                  navigateText: 'перейти',
                  closeText: 'закрыть',
                },
              },
            },
          },
          en: {
            translations: {
              button: {
                buttonText: 'Search',
                buttonAriaLabel: 'Search',
              },
              modal: {
                displayDetails: 'Detailed list',
                resetButtonTitle: 'Reset search',
                backButtonTitle: 'Close search',
                noResultsText: 'Nothing found',
                footer: {
                  selectText: 'to select',
                  navigateText: 'to navigate',
                  closeText: 'to close',
                },
              },
            },
          },
        },
      },
    },
  },
});
