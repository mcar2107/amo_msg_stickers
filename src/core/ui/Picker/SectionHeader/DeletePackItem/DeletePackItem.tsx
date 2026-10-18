import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import { MenuItem } from '@ui/Menu/MenuItem';
import { useMenuClose } from '@ui/Menu/useMenuClose';
import { useConfirmPress } from '@ui/useConfirmPress';

import type { DeletePackItemProps } from './DeletePackItem.types';

/**
 * Пункт «Удалить пак» с подтверждением повторным выбором: первый выбор меняет подпись на
 * «Точно удалить?» и оставляет меню открытым, второй за 2,5 с закрывает меню и удаляет пак.
 */
export const DeletePackItem: FC<DeletePackItemProps> = (props) => {
  const { onConfirm } = props;
  const closeMenu = useMenuClose();
  const { isArmed, press } = useConfirmPress();

  const handleItemSelect = () => {
    if (!press()) return;

    closeMenu();
    onConfirm();
  };

  return (
    <MenuItem variant="danger" onSelect={handleItemSelect}>
      {isArmed ? t('pack.deleteConfirm') : t('pack.delete')}
    </MenuItem>
  );
};
