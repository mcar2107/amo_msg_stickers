import type { RemoteGif } from '@core/db.types';
import type { TileRect } from '@ui/MasonryGrid/tileBox';

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
   * Колбэк на выбор «Убрать из недавних» в контекстном меню. Не задан — удаления в меню нет.
   */
  onRemove?: ((gif: RemoteGif) => void) | undefined;

  /**
   * Колбэк на выбор пункта избранного в контекстном меню: GIF добавляется в избранное или
   * убирается из него.
   */
  onFavoriteToggle: () => void;
};
