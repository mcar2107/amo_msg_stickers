export type IconColorState = {
  /**
   * Открыт ли попап у этой кнопки.
   */
  isOpen: boolean;

  /**
   * Идёт ли редактирование сообщения в поле ввода кнопки.
   */
  isEditing: boolean;
};

export type IconClassChange = {
  /**
   * Классы цвета, которые должны стоять на иконке.
   */
  add: string[];

  /**
   * Классы цвета других состояний: их на иконке быть не должно.
   */
  remove: string[];
};
