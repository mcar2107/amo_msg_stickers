import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';

import type { RevealButtonProps } from './RevealButton.types';

/**
 * Текстовая кнопка цвета подписи: она вторична к полю и не должна спорить с главной кнопкой
 * экрана.
 */
const REVEAL_BUTTON_CLASS = [
  'h-8 shrink-0 cursor-pointer rounded-lg bg-transparent px-2 font-primary text-xs leading-[normal]',
  'text-cadetGray-30 dark:text-gray-70',
  'hover:bg-cadetGray-30/[.14] dark:hover:bg-white-0/[.07]',
  'motion-safe:transition-colors motion-safe:duration-base',
].join(' ');

/**
 * Обе подписи лежат в одной ячейке сетки, и неактуальная скрыта `aria-hidden`: кнопка
 * шириной в длинную подпись, и поле рядом не меняет ширину при нажатии. Скрытая подпись не
 * видна и не входит в имя кнопки.
 */
const LABEL_CLASS = '[grid-area:1/1] aria-[hidden=true]:invisible';

/**
 * Кнопка показа скрытого значения. Подпись называет следующее действие, а `aria-pressed`
 * отдаёт скринридеру состояние: показанное значение — «Скрыть», нажата.
 */
export const RevealButton: FC<RevealButtonProps> = (props) => {
  const { fieldId, isRevealed, onToggle } = props;

  const handleRevealClick = () => {
    onToggle();
  };

  return (
    <button
      type="button"
      aria-pressed={isRevealed}
      aria-controls={fieldId}
      className={REVEAL_BUTTON_CLASS}
      onClick={handleRevealClick}
    >
      <span className="grid">
        <span aria-hidden={isRevealed} className={LABEL_CLASS}>
          {t('settings.show')}
        </span>

        <span aria-hidden={!isRevealed} className={LABEL_CLASS}>
          {t('settings.hide')}
        </span>
      </span>
    </button>
  );
};
