import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import { useConfirmPress } from '@ui/useConfirmPress';

import type { ClearRecentButtonProps } from './ClearRecentButton.types';

/**
 * В покое кнопка приглушена, как заголовок: она — служебное действие раздела, а не его
 * содержимое. Взведённая — красная: следующее нажатие необратимо.
 */
const clearVariants = cva(
  [
    'h-6 shrink-0 cursor-pointer rounded-md bg-transparent px-1.5 font-primary text-xs leading-[normal]',
    'transition-colors duration-base hover:bg-cadetGray-30/[.14] dark:hover:bg-white-0/[.07]',
  ],
  {
    variants: {
      isArmed: {
        true: 'text-red-30',
        false: 'text-cadetGray-30 dark:text-gray-70',
      },
    },
  }
);

/**
 * «Очистить» у недавних стикеров и недавних GIF с подтверждением повторным нажатием: первое нажатие меняет
 * подпись на «Точно очистить?», без второго за 2,5 с подпись возвращается.
 */
export const ClearRecentButton: FC<ClearRecentButtonProps> = (props) => {
  const { onConfirm } = props;
  const { isArmed, press } = useConfirmPress();

  const handleClearClick = () => {
    if (press()) onConfirm();
  };

  return (
    <button
      type="button"
      className={clearVariants({ isArmed })}
      onClick={handleClearClick}
    >
      {isArmed ? t('menu.clearRecentConfirm') : t('menu.clearRecent')}
    </button>
  );
};
