/**
 * Срез `keydown`, по которому решается, чей Escape.
 */
export type EscapeKeyEvent = {
  /**
   * Нажатая клавиша.
   */
  key: string;

  /**
   * Идёт ли набор IME: Escape в нём отменяет набор.
   */
  isComposing: boolean;

  /**
   * Путь события сквозь shadow root: цель, её предки, документ и окно.
   */
  composedPath: () => readonly object[];
};
