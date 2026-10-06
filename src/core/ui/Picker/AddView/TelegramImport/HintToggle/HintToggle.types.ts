export type HintToggleProps = {
  /**
   * id инструкции, которую кнопка раскрывает.
   */
  hintId: string;

  /**
   * Инструкция раскрыта.
   */
  isExpanded: boolean;

  /**
   * Колбэк на нажатие: раскрыть или свернуть инструкцию.
   */
  onToggle: () => void;
};
