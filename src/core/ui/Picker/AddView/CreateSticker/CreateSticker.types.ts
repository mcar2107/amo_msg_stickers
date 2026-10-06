export type CreateStickerProps = {
  /**
   * Имя выбранного файла; `null` — файл ещё не выбран.
   */
  fileName: string | null;

  /**
   * Подпись, как её ввёл пользователь.
   */
  caption: string;

  /**
   * Object URL превью готового стикера; `null` — превью нет.
   */
  previewUrl: string | null;

  /**
   * Стикер собирается: после выбора файла или правки подписи, включая задержку ввода
   * подписи. Превью, если есть, — от прежней сборки.
   */
  isConverting: boolean;

  /**
   * Колбэк на выбор файла; `undefined` — выбор отменён.
   */
  onPick: (file: File | undefined) => void;

  /**
   * Колбэк на правку подписи.
   */
  onCaptionChange: (caption: string) => void;
};
