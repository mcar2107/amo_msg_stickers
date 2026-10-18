import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import { MenuItem } from '@ui/Menu/MenuItem';
import { useMenuClose } from '@ui/Menu/useMenuClose';

import type { PreviewItemProps } from './PreviewItem.types';

/**
 * Пункт меню ячейки, открывающий закреплённый предпросмотр. Меню закрывается первым: оно
 * возвращает фокус на ячейку, а фокус на кнопку «Закрыть предпросмотр» ставит оверлей после
 * монтирования, то есть позже.
 */
export const PreviewItem: FC<PreviewItemProps> = (props) => {
  const { onPreview } = props;
  const closeMenu = useMenuClose();

  const handleItemSelect = () => {
    closeMenu();
    onPreview();
  };

  return <MenuItem onSelect={handleItemSelect}>{t('menu.preview')}</MenuItem>;
};
