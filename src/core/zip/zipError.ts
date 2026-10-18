import type { ZipErrorKind } from './zip.types';

/**
 * Ошибка архива. Текст — для разработчика (консоль, `cause`); пользователю вызывающая сторона
 * показывает свою строку по `kind`.
 */
export class ZipError extends Error {
  /**
   * Вид ошибки, по которому вызывающая сторона выбирает текст для пользователя.
   */
  readonly kind: ZipErrorKind;

  /**
   * @param kind — вид ошибки
   * @param message — что именно не так, для разработчика
   * @param options — исходная ошибка, если есть
   */
  constructor(kind: ZipErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ZipError';
    this.kind = kind;
  }
}
