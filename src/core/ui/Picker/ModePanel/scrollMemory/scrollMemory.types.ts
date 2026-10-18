/**
 * Срез элемента, прокрутку которого помнит режим: тест подставляет объект без браузера.
 */
export type ScrollBox = Pick<Element, 'scrollTop' | 'isConnected'>;

export type ScrollMemory = {
  /**
   * Запоминает текущую прокрутку элемента.
   */
  remember: (box: ScrollBox) => void;

  /**
   * Возвращает запомненную прокрутку элементам, которые ещё в документе.
   */
  restore: () => void;
};
