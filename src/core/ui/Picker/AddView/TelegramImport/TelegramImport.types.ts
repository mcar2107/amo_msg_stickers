import type { PackCard } from '../../PickerProvider/packCardView/packCardView.types';

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
   * Карточка пака под полем: превью до импорта или ход импорта; `null` — карточки нет.
   */
  card: PackCard | null;

  /**
   * Сегмент «Telegram» выбран и панель видна: показ сегмента отмечает инструкцию увиденной.
   */
  isActive: boolean;

  /**
   * Колбэк на правку ссылки.
   */
  onLinkChange: (link: string) => void;
};
