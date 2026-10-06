export type FieldDescriptionIds = {
  /**
   * id ошибки значения поля.
   */
  error: string;

  /**
   * id результата проверки значения.
   */
  result: string;

  /**
   * id подсказки под полем.
   */
  hint: string;
};

export type FieldDescriptionParts = {
  /**
   * Под полем показана ошибка значения.
   */
  hasError: boolean;

  /**
   * Под полем показан результат проверки.
   */
  hasResult: boolean;

  /**
   * Под полем показана подсказка.
   */
  hasHint: boolean;

  /**
   * id описаний вне поля через пробел — например, раскрытой инструкции.
   */
  describedBy?: string;
};
