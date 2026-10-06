export type StatusBarProps = {
  /**
   * Открыт экран: строка встаёт над его футером и не перекрывает главную кнопку.
   */
  isRaised: boolean;

  /**
   * Колбэк на смену высоты строки; 0 — статуса нет.
   */
  onHeightChange: (height: number) => void;
};
