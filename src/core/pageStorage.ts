import type { PageStorage } from './pageStorage.types';

/**
 * `localStorage` страницы, к которому обращаются только внутри методов: сам геттер
 * `window.localStorage` бросает под запретом хранилища сайта. Исключения методов ловят модули,
 * которые им пользуются, — сбой хранилища не выходит в интерфейс.
 */
export const PAGE_STORAGE: PageStorage = {
  getItem: (key) => {
    return localStorage.getItem(key);
  },
  setItem: (key, value) => {
    localStorage.setItem(key, value);
  },
};
