/**
 * Типы `input`, в которые печатают.
 */
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'password',
  'url',
  'email',
  'tel',
  'number',
]);

/**
 * Поле, в которое печатают: фокус в нём удерживает попап, и в него экран ставит фокус при
 * открытии.
 *
 * @param target — цель события или узел
 * @returns `true` для `textarea` и `input` текстового типа
 */
export const isTextField = (
  target: EventTarget | null
): target is HTMLInputElement | HTMLTextAreaElement => {
  if (target instanceof HTMLTextAreaElement) return true;

  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
};
