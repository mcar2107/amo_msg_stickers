import type { FunctionComponent as FC, TargetedKeyboardEvent } from 'preact';

import { modePanelId, modeTabId } from '@ui/ModePanel';
import { moveTabFocus } from '@ui/moveTabFocus';
import { usePickerView } from '@ui/usePickerView';

import type { ModeTabProps } from './ModeTab.types';

/**
 * Шрифт задаётся явно: preflight Tailwind сбрасывает у кнопки `font` в `inherit`.
 */
const MODE_TAB_CLASS = [
  'flex h-7 shrink-0 cursor-pointer items-center rounded-lg bg-transparent px-3',
  'font-primary text-xs font-semibold leading-none',
  'text-cadetGray-30 hover:bg-cadetGray-30/[.14] dark:text-gray-70 dark:hover:bg-white-0/[.07]',
  'aria-selected:bg-cadetGray-30/[.14] aria-selected:text-blue-50',
  'dark:aria-selected:bg-white-0/[.07] dark:aria-selected:text-beige-70',
  'motion-safe:transition-colors motion-safe:duration-base',
].join(' ');

/**
 * Кнопка режима — вкладка паттерна ARIA tabs: в порядке Tab стоит только выбранная, между
 * кнопками ходят стрелками, `Home` и `End`, открывает режим Enter, пробел или клик.
 */
export const ModeTab: FC<ModeTabProps> = (props) => {
  const { mode, title } = props;
  const { mode: currentMode, setMode } = usePickerView();
  const isSelected = mode === currentMode;

  const handleModeClick = () => {
    setMode(mode);
  };

  const handleModeKeyDown = (event: TargetedKeyboardEvent<HTMLButtonElement>) => {
    if (moveTabFocus(event.key, event.currentTarget)) event.preventDefault();
  };

  return (
    <button
      type="button"
      role="tab"
      id={modeTabId(mode)}
      aria-selected={isSelected}
      aria-controls={modePanelId(mode)}
      tabIndex={isSelected ? 0 : -1}
      className={MODE_TAB_CLASS}
      onClick={handleModeClick}
      onKeyDown={handleModeKeyDown}
    >
      {title}
    </button>
  );
};
