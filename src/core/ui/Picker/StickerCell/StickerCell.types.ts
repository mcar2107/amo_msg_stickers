import type { SendItem } from '../../../db.types';
import type { CellNames } from '../cellName/cellName.types';
import type { CellRemoveKind } from '../Menu/CellMenu/CellMenu.types';

export type StickerCellProps = {
  /**
   * id кнопки ячейки — по нему ячейку находит фокус после удаления соседней.
   */
  id?: string;

  /**
   * Что отправляет ячейка по нажатию.
   */
  item: SendItem;

  /**
   * Пак раздела ячейки: успешная отправка отмечает его использованным, и при следующем
   * открытии попапа он поднимается в порядке паков. undefined — ячейка «Недавних»:
   * отправка оттуда порядок паков не меняет.
   */
  packId?: string | undefined;

  /**
   * Адрес картинки стикера или превью GIF.
   */
  url: string;

  /**
   * Эмодзи стикера: предпросмотр показывает его над картинкой. undefined — эмодзи нет.
   */
  emoji?: string | undefined;

  /**
   * Доступные имена кнопки отправки и контекстного меню на языке интерфейса.
   */
  name: CellNames;

  /**
   * Что убирает пункт контекстного меню: стикер из библиотеки или элемент из недавних.
   */
  removeKind: CellRemoveKind;

  /**
   * Колбэк на выбор пункта контекстного меню — элемент ячейки убирается.
   */
  onRemove: (item: SendItem) => void;
};
