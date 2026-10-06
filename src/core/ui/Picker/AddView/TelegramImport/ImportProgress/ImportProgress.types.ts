export type ImportProgressProps = {
  /**
   * Сколько стикеров обработано.
   */
  done: number;

  /**
   * Всего стикеров в наборе; `0` — набор ещё не получен.
   */
  total: number;
};
