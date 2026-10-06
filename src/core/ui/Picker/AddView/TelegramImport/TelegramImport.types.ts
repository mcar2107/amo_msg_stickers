export type TelegramImportProps = {
  /**
   * Ссылка на пак или его имя, как ввёл пользователь.
   */
  link: string;

  /**
   * Доля обработанных стикеров в процентах; `null` — импорт не идёт, полосы нет.
   */
  percent: number | null;

  /**
   * Сегмент «Telegram» выбран и панель видна.
   */
  isActive: boolean;

  /**
   * Колбэк на правку ссылки.
   */
  onLinkChange: (link: string) => void;
};
