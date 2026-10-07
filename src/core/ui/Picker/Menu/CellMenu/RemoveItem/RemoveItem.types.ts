import type { CellRemoveKind } from '../CellMenu.types';

export type RemoveItemProps = {
  /**
   * Что убирает пункт: от этого его подпись и цвет.
   */
  kind: CellRemoveKind;

  /**
   * Колбэк на окончательный выбор пункта — после закрытия меню: у стикера — на подтверждение
   * повторным выбором.
   */
  onRemove: () => void;
};
