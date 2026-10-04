export type TelegramTokenText = {
  /**
   * Подпись поля токена.
   */
  label: 'settings.telegram.label' | 'settings.telegram.labelOptional';

  /**
   * Подсказка под полем: ссылки на @BotFather (`{link}`) и доку (`{docs}`).
   */
  hint: 'settings.telegram.hint' | 'settings.telegram.hintOptional';
};
