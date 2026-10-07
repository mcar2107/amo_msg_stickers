import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';
import { PlusIcon } from '../../PlusIcon/PlusIcon';
import { usePickerView } from '../../usePickerView/usePickerView';

/**
 * Вид — как у вкладки полосы, без выбранного состояния: кнопка стоит в одной строке с вкладками.
 */
const BUTTON_CLASS = [
  'flex size-8.5 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-transparent p-1',
  'text-cadetGray-30 hover:bg-cadetGray-30/[.14] dark:text-gray-70 dark:hover:bg-white-0/[.07]',
  'motion-safe:transition-colors motion-safe:duration-base',
].join(' ');

/**
 * Кнопка «Добавить стикеры» справа от полосы вкладок. Не вкладка: она открывает экран, а не
 * выбирает раздел, поэтому лежит вне `tablist` и не прокручивается вместе с вкладками.
 *
 * Сегмент не задаёт: экран открывается на том, что пользователь выбрал последним.
 */
export const AddButton: FC = () => {
  const { openScreen } = usePickerView();
  const title = t('add.title');

  const handleAddClick = () => {
    openScreen('add');
  };

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      className={BUTTON_CLASS}
      onClick={handleAddClick}
    >
      <PlusIcon />
    </button>
  );
};
