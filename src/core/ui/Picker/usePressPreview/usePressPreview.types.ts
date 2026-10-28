import type { PressStart } from '@ui/pressGesture';

/**
 * Параметры хука удержания на ячейке.
 */
export type UsePressPreviewOptions = {
  /**
   * Удержание состоялось; получает кнопку ячейки, с которой открывается предпросмотр.
   */
  onHold: (source: HTMLElement) => void;

  /**
   * Указатель с зажатой основной кнопкой вошёл на ячейку: предпросмотр, открытый удержанием,
   * должен показать её; получает кнопку этой ячейки.
   */
  onSwap: (source: HTMLElement) => void;

  /**
   * Ячейка занята (идёт отправка): удержание не запускается.
   */
  isDisabled: boolean;
};

/**
 * Вход указателя на ячейку: поля совпадают с полями `PointerEvent`.
 */
type PressEntry = {
  /**
   * Вид указателя: `mouse`, `pen` или `touch`.
   */
  pointerType: string;

  /**
   * Маска зажатых кнопок (`PointerEvent.buttons`).
   */
  buttons: number;
};

/**
 * Методы удержания, которые ячейка вызывает из своих обработчиков pointer-событий.
 */
export type PressPreviewMethods = {
  /**
   * Нажатие на ячейку: запускает отсчёт удержания.
   *
   * @param press — нажатие
   * @param source — кнопка ячейки
   */
  start: (press: PressStart, source: HTMLElement) => void;

  /**
   * Вход указателя на ячейку при зажатой кнопке переключает предпросмотр на неё.
   *
   * @param entry — вход указателя
   * @param source — кнопка ячейки
   */
  enter: (entry: PressEntry, source: HTMLElement) => void;

  /**
   * Движение: сдвиг дальше порога отменяет удержание.
   *
   * @param x — горизонтальная координата указателя
   * @param y — вертикальная координата указателя
   */
  move: (x: number, y: number) => void;

  /**
   * Отпускание, уход с ячейки или отмена жеста браузером: отсчёт останавливается.
   */
  cancel: () => void;
};
