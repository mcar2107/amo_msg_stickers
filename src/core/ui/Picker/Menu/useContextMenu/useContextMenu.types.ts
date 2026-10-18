import type { MenuOpening } from '@ui/Menu';
import type { MenuPoint } from '@ui/Menu/menuPosition';

/**
 * Открытое контекстное меню с номером открытия.
 */
export type ContextMenuOpening = MenuOpening & {
  /**
   * Номер открытия — ключ меню: повторный правый клик по той же ячейке ставит меню заново на
   * новое место, а не оставляет его на прежнем.
   */
  seq: number;
};

export type ContextMenu = {
  /**
   * Открытое меню; `null` — меню закрыто.
   */
  opening: ContextMenuOpening | null;

  /**
   * Открывает меню у элемента-источника: от точки события `contextmenu` или, без точки (меню с
   * клавиатуры), от самого элемента.
   */
  open: (point: MenuPoint | null, source: HTMLElement) => void;

  /**
   * Закрывает меню.
   */
  close: () => void;
};
