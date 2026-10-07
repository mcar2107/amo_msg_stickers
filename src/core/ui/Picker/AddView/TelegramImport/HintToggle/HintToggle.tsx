import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../../i18n/translate';

import type { HintToggleProps } from './HintToggle.types';

/**
 * Значок размером со строку подписи и её цвета: кнопка вторична к полю и не спорит с ним, а
 * наведение и раскрытая инструкция подсвечивают её акцентом, как выбранную вкладку. Зона
 * нажатия шире значка на 4 px с каждой стороны (`before:`): 16 px мало для курсора.
 */
const HINT_TOGGLE_CLASS = [
  'relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full',
  "bg-transparent p-0 before:absolute before:-inset-1 before:content-['']",
  'text-cadetGray-30 hover:text-blue-50 aria-expanded:text-blue-50',
  'dark:text-gray-70 dark:hover:text-beige-70 dark:aria-expanded:text-beige-70',
  'motion-safe:transition-colors motion-safe:duration-base',
].join(' ');

/**
 * Вопрос в круге — как значок справки рядом с подписью.
 */
const QUESTION_PATH = 'M6.1 6.2a1.9 1.9 0 1 1 2.7 1.75c-.5.24-.8.62-.8 1.15v.35';

/**
 * Кнопка «?» сразу после подписи поля ссылки: раскрывает и сворачивает инструкцию импорта.
 * Значок скринридеру ничего не говорит, поэтому имя кнопки — «Как получить ссылку», а
 * `aria-expanded` отдаёт состояние. Кнопка стоит в строке подписи рядом с `<label>`, а не
 * внутри: её имя попало бы в имя поля.
 */
export const HintToggle: FC<HintToggleProps> = (props) => {
  const { hintId, isExpanded, onToggle } = props;

  const handleToggleClick = () => {
    onToggle();
  };

  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      aria-controls={hintId}
      aria-label={t('add.telegram.hintToggle')}
      title={t('add.telegram.hintToggle')}
      className={HINT_TOGGLE_CLASS}
      onClick={handleToggleClick}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
        <circle
          cx="8"
          cy="8"
          r="6.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />

        <path
          d={QUESTION_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        <circle cx="8" cy="11.45" r="0.8" fill="currentColor" />
      </svg>
    </button>
  );
};
