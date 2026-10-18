import { useContext } from 'preact/hooks';

import { MenuContext } from '@ui/Menu';

/**
 * Закрытие меню, в котором лежит пункт: фокус возвращается на источник меню.
 *
 * @returns закрытие меню
 */
export const useMenuClose = (): (() => void) => {
  const close = useContext(MenuContext);

  if (!close) throw new Error('useMenuClose: пункт вне Menu');

  return close;
};
