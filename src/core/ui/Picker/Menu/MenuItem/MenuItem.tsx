import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC } from 'preact';

import type { MenuItemProps } from './MenuItem.types';

export const menuItemVariants = cva(
  [
    'flex h-8 w-full shrink-0 items-center whitespace-nowrap rounded-md bg-transparent px-3',
    'text-left font-primary text-xsm leading-[normal] transition-colors duration-base',
    'focus-visible:bg-cadetGray-30/[.14] dark:focus-visible:bg-white-0/[.07]',
  ],
  {
    variants: {
      variant: {
        default: 'text-gray-30 dark:text-gray-40',
        danger: 'text-red-30',
      },
      isDisabled: {
        false: 'cursor-pointer hover:bg-cadetGray-30/[.14] dark:hover:bg-white-0/[.07]',
        true: 'cursor-default opacity-50',
      },
    },
    defaultVariants: {
      variant: 'default',
      isDisabled: false,
    },
  }
);

/**
 * Пункт меню. Вне порядка Tab: по пунктам ходят стрелки, Tab закрывает меню.
 *
 * Недоступный пункт помечен `aria-disabled`, а не `disabled`: по паттерну ARIA menu он остаётся в обходе стрелками и
 * читается скринридером как недоступный, а кнопку с `disabled` браузер не даёт сфокусировать, и стрелка на ней
 * оставила бы фокус на месте.
 */
export const MenuItem: FC<MenuItemProps> = (props) => {
  const { variant, isDisabled = false, onSelect, children } = props;

  const handleItemClick = () => {
    if (isDisabled) return;

    onSelect();
  };

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={isDisabled || undefined}
      className={menuItemVariants({ variant, isDisabled })}
      onClick={handleItemClick}
    >
      {children}
    </button>
  );
};
