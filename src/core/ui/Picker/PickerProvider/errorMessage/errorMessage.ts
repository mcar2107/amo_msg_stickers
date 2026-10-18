/**
 * Текст ошибки для строки статуса: отклонить промис можно чем угодно, не только `Error`.
 *
 * @param error — причина отказа
 * @returns сообщение ошибки или её строковое представление
 */
export const errorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : String(error);
};
