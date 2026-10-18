import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import { FEED_LABELS } from '@core/sources';

import type { FeedChipProps } from './FeedChip.types';

/**
 * Выбранный чип — вариантом `aria-pressed:`: состояние читается из того же атрибута,
 * который слышит скринридер.
 *
 * Подложка наведения — только у невыбранного (`aria-[pressed=false]:`): правило наведения
 * специфичнее `aria-pressed:` и иначе перекрасило бы выбранный чип. Выбранный при
 * наведении темнеет фильтром, как основная кнопка.
 *
 * Длительность — под `motion-safe:`, как и переход: длительность по умолчанию из
 * `motion-safe:transition-*` перебила бы простую `duration-base`.
 */
const CHIP_CLASS = [
  'cursor-pointer rounded-xl border-0 px-[9px] py-[3px] text-xs',
  'motion-safe:transition-[color,background-color,border-color,filter] motion-safe:duration-base',
  'bg-cadetGray-30/[.12] text-cadetGray-30 dark:bg-white-0/[.06] dark:text-gray-70',
  'aria-[pressed=false]:enabled:hover:bg-cadetGray-30/[.2]',
  'dark:aria-[pressed=false]:enabled:hover:bg-white-0/[.1]',
  'aria-pressed:bg-blue-50 aria-pressed:text-white-0',
  'dark:aria-pressed:bg-beige-70 dark:aria-pressed:text-gray-10',
  'aria-pressed:enabled:hover:brightness-[.92] dark:aria-pressed:enabled:hover:brightness-[1.08]',
].join(' ');

export const FeedChip: FC<FeedChipProps> = (props) => {
  const { feed, isSelected, onSelect } = props;

  const handleChipClick = () => {
    onSelect(feed);
  };

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={CHIP_CLASS}
      onClick={handleChipClick}
    >
      {t(FEED_LABELS[feed])}
    </button>
  );
};
