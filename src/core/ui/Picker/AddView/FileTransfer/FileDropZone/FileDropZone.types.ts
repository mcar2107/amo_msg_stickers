export type FileDropZoneProps = {
  /**
   * Файл выбран: кнопка — «Заменить файл».
   */
  hasFile: boolean;

  /**
   * Выбор недоступен: идёт импорт, и новый файл заменил бы карточку импортируемого.
   */
  isDisabled: boolean;

  /**
   * Колбэк на выбор файла в диалоге или перетаскиванием; `undefined` — файла в выборе нет.
   */
  onPick: (file: File | undefined) => void;
};
