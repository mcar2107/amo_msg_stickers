export type ImportHintState = {
  /**
   * Инструкция импорта раскрыта.
   */
  isHintOpen: boolean;

  /**
   * Раскрывает свёрнутую инструкцию и сворачивает раскрытую.
   */
  toggleHint: () => void;
};
