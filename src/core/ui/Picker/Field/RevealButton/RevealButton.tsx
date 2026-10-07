import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';

import type { RevealButtonProps } from './RevealButton.types';

/**
 * Значок внутри поля справа, цвета подписи: кнопка вторична к полю и не спорит с главной
 * кнопкой экрана. Отступы `TextInput` (`hasTrailingAction`) держат текст поля левее неё.
 */
const REVEAL_BUTTON_CLASS = [
  'absolute inset-y-0 right-1 my-auto flex size-7 cursor-pointer items-center justify-center rounded-md',
  'bg-transparent text-cadetGray-30 dark:text-gray-70',
  'hover:bg-cadetGray-30/[.14] hover:text-cadetGray-10 dark:hover:bg-white-0/[.07] dark:hover:text-gray-90',
  'motion-safe:transition-colors motion-safe:duration-base',
].join(' ');

const EYE_PATH = [
  'M12 5c4.4 0 7.9 3 9.4 6.6a1 1 0 0 1 0 .8C19.9 16 16.4 19 12 19s-7.9-3-9.4-6.6a1 1 0 0 1',
  ' 0-.8C4.1 8 7.6 5 12 5Zm0 1.8c-3.4 0-6.2 2.2-7.6 5.2 1.4 3 4.2 5.2 7.6 5.2s6.2-2.2',
  ' 7.6-5.2c-1.4-3-4.2-5.2-7.6-5.2Zm0 2a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 1.8a1.4 1.4',
  ' 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z',
].join('');

/**
 * Перечёркнутый глаз: значение показано, нажатие его скроет.
 */
const EYE_OFF_PATH = [
  'M4.2 3.6a.9.9 0 0 0-1.3 1.3l2.5 2.4A11 11 0 0 0 2.6 11.6a1 1 0 0 0 0 .8C4.1 16 7.6 19 12 19',
  'c1.7 0 3.2-.4 4.6-1.2l3.2 3.1a.9.9 0 0 0 1.3-1.3L4.2 3.6Zm11.1 12.9A7.6 7.6 0 0 1 12 17.2',
  'c-3.4 0-6.2-2.2-7.6-5.2.6-1.3 1.5-2.5 2.6-3.4l2.2 2.2a3.2 3.2 0 0 0 4.1 4.1l2 1.6ZM12 5',
  'c4.4 0 7.9 3 9.4 6.6a1 1 0 0 1 0 .8 11 11 0 0 1-2 3l-1.3-1.3c.6-.6 1.1-1.3 1.5-2.1',
  '-1.4-3-4.2-5.2-7.6-5.2-.8 0-1.6.1-2.3.3L8.3 5.7C9.5 5.2 10.7 5 12 5Z',
].join('');

/**
 * Кнопка показа скрытого значения — значок глаза внутри поля. Имя и подсказка называют
 * следующее действие, а `aria-pressed` отдаёт скринридеру состояние: показанное значение —
 * «Скрыть», нажата.
 */
export const RevealButton: FC<RevealButtonProps> = (props) => {
  const { fieldId, isRevealed, onToggle } = props;
  const label = t(isRevealed ? 'settings.hide' : 'settings.show');

  const handleRevealClick = () => {
    onToggle();
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={isRevealed}
      aria-controls={fieldId}
      className={REVEAL_BUTTON_CLASS}
      onClick={handleRevealClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4.5 fill-current">
        <path d={isRevealed ? EYE_OFF_PATH : EYE_PATH} />
      </svg>
    </button>
  );
};
