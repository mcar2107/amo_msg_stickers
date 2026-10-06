export type StatusBarProps = {
  /**
   * Открыт экран с футером: строка встаёт над футером и не перекрывает главную кнопку.
   */
  isRaised: boolean;

  /**
   * Колбэк на смену высоты строки; 0 — статуса нет.
   */
  onHeightChange: (height: number) => void;
};
