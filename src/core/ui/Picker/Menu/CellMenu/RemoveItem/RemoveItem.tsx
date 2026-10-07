import type { FunctionComponent as FC } from 'preact';

import type { MessageKey } from '../../../../../i18n/i18n.types';
import { t } from '../../../../../i18n/translate';
import { useConfirmPress } from '../../../useConfirmPress/useConfirmPress';
import { MenuItem } from '../../MenuItem/MenuItem';
import type { MenuItemVariant } from '../../MenuItem/MenuItem.types';
import { useMenuClose } from '../../useMenuClose/useMenuClose';
import type { CellRemoveKind } from '../CellMenu.types';

import type { RemoveItemProps } from './RemoveItem.types';

/**
 * Ключи, а не тексты: язык выбирается в `start()`, после вычисления модуля.
 */
const REMOVE_LABEL: Record<CellRemoveKind, MessageKey> = {
  sticker: 'menu.removeSticker',
  recent: 'menu.removeRecent',
};

/**
 * Удаление стикера необратимо — пункт красный; из недавних элемент вернёт следующая отправка.
 */
const REMOVE_VARIANT: Record<CellRemoveKind, MenuItemVariant> = {
  sticker: 'danger',
  recent: 'default',
};

/**
 * Подпись взведённого подтверждения; `null` — пункт срабатывает с первого выбора. Удаление
 * стикера подтверждается, как удаление пака: вернуть стикер можно только повторным импортом
 * или сборкой заново, а «Предпросмотр» стоит прямо над пунктом.
 */
const CONFIRM_LABEL: Record<CellRemoveKind, MessageKey | null> = {
  sticker: 'menu.removeStickerConfirm',
  recent: null,
};

/**
 * Пункт меню ячейки, убирающий её элемент. С подтверждением первый выбор меняет подпись и
 * оставляет меню открытым, второй за 2,5 с закрывает меню и убирает элемент.
 */
export const RemoveItem: FC<RemoveItemProps> = (props) => {
  const { kind, onRemove } = props;
  const closeMenu = useMenuClose();
  const { isArmed, press } = useConfirmPress();
  const confirmLabel = CONFIRM_LABEL[kind];

  const handleItemSelect = () => {
    if (confirmLabel && !press()) return;

    closeMenu();
    onRemove();
  };

  return (
    <MenuItem variant={REMOVE_VARIANT[kind]} onSelect={handleItemSelect}>
      {t((isArmed && confirmLabel) || REMOVE_LABEL[kind])}
    </MenuItem>
  );
};
