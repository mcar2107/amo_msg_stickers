const svg = (viewBox: string, body: string, attrs = '') => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${attrs}>${body}</svg>`;
};

/**
 * 18×18, в стиле иконки эмодзи amo: заливка, цвет задаётся классом `fill-*` или, с `fill`, —
 * атрибутом: `currentColor` берёт цвет из `text-*` разметки, где так окрашена кнопка эмодзи.
 *
 * @param className — классы иконки
 * @param fill — атрибут `fill`; без него заливку задают классы
 * @returns svg-строка иконки
 */
export const stickerIcon = (className: string, fill?: string) => {
  return svg(
    '0 0 18 18',
    `<path fill-rule="evenodd" d="M3.5 1h8.09c.4 0 .78.16 1.06.44l3.91 3.91c.28.28.44.66.44 1.06v8.09A2.5 2.5 0 0 1 14.5 17h-11A2.5 2.5 0 0 1 1 14.5v-11A2.5 2.5 0 0 1 3.5 1Zm0 1.3c-.66 0-1.2.54-1.2 1.2v11c0 .66.54 1.2 1.2 1.2h11c.66 0 1.2-.54 1.2-1.2V7.3h-2.9a2.3 2.3 0 0 1-2.3-2.3V2.3h-7Zm8.3.62V5c0 .55.45 1 1 1h2.08L11.8 2.92ZM6.2 9.1a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm4.5-.9a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0Zm-5.05 2.6a.6.6 0 0 1 .82.2 2.9 2.9 0 0 0 4.98 0 .6.6 0 1 1 1.03.62 4.1 4.1 0 0 1-7.04 0 .6.6 0 0 1 .2-.82Z"/>`,
    fill ? `class="${className}" fill="${fill}"` : `class="${className}"`
  );
};
