import type { ImportCount } from '../../PickerProvider/PickerProvider.types';

export type TelegramImportProps = {
  /**
   * Ссылка на пак или его имя, как ввёл пользователь.
   */
  link: string;

  /**
   * Ошибка значения поля ссылки; `null` — ошибки нет, поле не помечено недействительным.
   */
  fieldError: string | null;

  /**
   * Ход импорта; `null` — импорт не идёт, полосы нет.
   */
  progress: ImportCount | null;

  /**
   * Сегмент «Telegram» выбран и панель видна: показ сегмента отмечает инструкцию увиденной.
   */
  isActive: boolean;

  /**
   * Колбэк на правку ссылки.
   */
  onLinkChange: (link: string) => void;
};
