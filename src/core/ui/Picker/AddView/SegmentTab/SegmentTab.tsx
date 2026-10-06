import type { FunctionComponent as FC, TargetedKeyboardEvent } from 'preact';

import { moveTabFocus } from '../../moveTabFocus/moveTabFocus';
import { usePickerView } from '../../usePickerView/usePickerView';
import { segmentFormId, segmentTabId } from '../segmentIds/segmentIds';

import type { SegmentTabProps } from './SegmentTab.types';

/**
 * Вид — как у кнопки режима в футере панели: сегменты — тот же переключатель, только внутри
 * экрана. Шрифт задаётся явно: preflight Tailwind сбрасывает у кнопки `font` в `inherit`.
 */
const SEGMENT_TAB_CLASS = [
  'flex h-7 flex-1 cursor-pointer items-center justify-center rounded-lg bg-transparent px-3',
  'font-primary text-xs font-semibold leading-none',
  'text-cadetGray-30 hover:bg-cadetGray-30/[.14] dark:text-gray-70 dark:hover:bg-white-0/[.07]',
  'aria-selected:bg-cadetGray-30/[.14] aria-selected:text-blue-50',
  'dark:aria-selected:bg-white-0/[.07] dark:aria-selected:text-beige-70',
  'motion-safe:transition-colors motion-safe:duration-base',
].join(' ');

/**
 * Вкладка сегмента экрана «Добавить стикеры» — паттерн ARIA tabs: в порядке Tab стоит только
 * выбранная, между вкладками ходят стрелками, `Home` и `End`, выбирает Enter, пробел или клик.
 */
export const SegmentTab: FC<SegmentTabProps> = (props) => {
  const { segment, title } = props;
  const { addSegment, chooseSegment } = usePickerView();
  const isSelected = segment === addSegment;

  const handleSegmentClick = () => {
    chooseSegment(segment);
  };

  const handleSegmentKeyDown = (event: TargetedKeyboardEvent<HTMLButtonElement>) => {
    if (moveTabFocus(event.key, event.currentTarget)) event.preventDefault();
  };

  return (
    <button
      type="button"
      role="tab"
      id={segmentTabId(segment)}
      aria-selected={isSelected}
      aria-controls={segmentFormId(segment)}
      tabIndex={isSelected ? 0 : -1}
      className={SEGMENT_TAB_CLASS}
      onClick={handleSegmentClick}
      onKeyDown={handleSegmentKeyDown}
    >
      {title}
    </button>
  );
};
