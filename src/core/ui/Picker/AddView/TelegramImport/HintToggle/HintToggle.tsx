import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../../i18n/translate';

import type { HintToggleProps } from './HintToggle.types';

/**
 * Кнопка лежит поверх строки подписи поля, а не внутри `<label>`: её имя попало бы в имя поля.
 * Раскрытая — с подложкой, как нажатая.
 */
const HINT_TOGGLE_CLASS = [
  'absolute -top-0.5 right-0 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full',
  'border border-solid border-cadetGray-30/[.4] bg-transparent p-0 font-primary text-xxs font-bold',
  'text-cadetGray-30 dark:border-gray-70/[.4] dark:text-gray-70',
  'hover:bg-cadetGray-30/[.14] dark:hover:bg-white-0/[.07]',
  'aria-expanded:bg-cadetGray-30/[.14] dark:aria-expanded:bg-white-0/[.07]',
  'motion-safe:transition-colors motion-safe:duration-base',
].join(' ');

/**
 * Кнопка «?» у подписи поля ссылки: раскрывает и сворачивает инструкцию импорта. Видимый знак
 * «?» скринридеру ничего не говорит, поэтому имя кнопки — «Как получить ссылку», а
 * `aria-expanded` отдаёт состояние.
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
      ?
    </button>
  );
};
