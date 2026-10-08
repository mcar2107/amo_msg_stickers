import type { RemoteGif } from '../../../../db.types';
import type { TileRect } from '../tileBox/tileBox.types';

export type MasonryCellProps = {
  /**
   * id кнопки ячейки — `gifCellId`: по нему фокус находит ячейку после удаления соседней, а
   * закреплённый предпросмотр — ячейку, на которую переключился стрелкой.
   */
  id: string;

  /**
   * GIF из поиска: превью в ячейке, по нажатию отправляется полноразмерная.
   */
  gif: RemoteGif;

  /**
   * Место и размер ячейки в ленте.
   */
  box: TileRect;

  /**
   * Колбэк на выбор «Убрать из недавних» в контекстном меню. Не задан — в меню ячейки один
   * пункт «Предпросмотр».
   */
  onRemove?: ((gif: RemoteGif) => void) | undefined;
};
