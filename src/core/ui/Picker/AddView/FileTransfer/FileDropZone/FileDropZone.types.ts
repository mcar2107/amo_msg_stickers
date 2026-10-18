import type { ComponentChildren } from 'preact';

export type FileDropZoneProps = {
  /**
   * Имя выбранного файла — кнопка тогда «Заменить файл»; `null` — файл не выбран.
   */
  fileName: string | null;

  /**
   * Карточка «что добавится»: встаёт в зону под имя файла вместо иконки и текста; `null` — карточки нет, файл не
   * выбран или не прочитался.
   */
  card: ComponentChildren;

  /**
   * Выбор недоступен: идёт импорт, и новый файл заменил бы карточку импортируемого.
   */
  isDisabled: boolean;

  /**
   * Колбэк на выбор файла в диалоге или перетаскиванием; `undefined` — файла в выборе нет.
   */
  onPick: (file: File | undefined) => void;
};
