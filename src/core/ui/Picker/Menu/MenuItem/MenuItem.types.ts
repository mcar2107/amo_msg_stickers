import type { VariantProps } from 'class-variance-authority';
import type { ComponentChildren } from 'preact';

import type { menuItemVariants } from './MenuItem';

export type MenuItemProps = Pick<VariantProps<typeof menuItemVariants>, 'variant'> & {
  /**
   * Пункт недоступен: выбор ничего не делает, но пункт остаётся в обходе стрелками.
   */
  isDisabled?: boolean;

  /**
   * Колбэк на выбор пункта: клик, Enter или пробел. Меню пункт не закрывает — закрывает сам
   * выбор через `useMenuClose`, если он окончательный.
   */
  onSelect: () => void;

  /**
   * Подпись пункта.
   */
  children: ComponentChildren;
};

export type MenuItemVariant = NonNullable<
  VariantProps<typeof menuItemVariants>['variant']
>;
