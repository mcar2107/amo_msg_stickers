export type RevealButtonProps = {
  /**
   * id поля, значение которого кнопка показывает.
   */
  fieldId: string;

  /**
   * Значение показано открытым текстом.
   */
  isRevealed: boolean;

  /**
   * Колбэк на нажатие: показать или скрыть значение.
   */
  onToggle: () => void;
};
