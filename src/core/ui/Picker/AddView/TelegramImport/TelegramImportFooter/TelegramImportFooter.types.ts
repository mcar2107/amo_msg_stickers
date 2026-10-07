export type TelegramImportFooterProps = {
  /**
   * Идёт импорт: на месте «Импорт» стоит «Отменить».
   */
  isImporting: boolean;

  /**
   * «Импорт» недоступен: ссылки нет или Telegram ответил, что пака нет. Недоступная кнопка не
   * даёт и отправить форму Enter-ом.
   */
  isDisabled: boolean;

  /**
   * Колбэк на отмену идущего импорта.
   */
  onCancel: () => void;
};
