import type { CellIdOf } from '../../cellIdOf/cellIdOf.types';
import type { PreviewDirection } from '../../Preview/previewDirection/previewDirection.types';
import type { ItemTile, MasonryTile } from '../splitColumns/splitColumns.types';

/**
 * Ближайшая плитка элемента, идя от `from` с шагом `delta`: соседи стоят рядом с текущей, и
 * поиск проходит только плитки между ними.
 *
 * @param tiles — плитки раскладки в порядке выдачи
 * @param from — номер текущей плитки
 * @param delta — `-1` — назад по выдаче, `1` — вперёд
 * @param column — колонка соседа; `null` — любая
 * @returns плитка элемента или `null`
 */
const nearestItem = <T>(
  tiles: readonly MasonryTile<T>[],
  from: number,
  delta: -1 | 1,
  column: number | null
): ItemTile<T> | null => {
  for (let index = from + delta; index >= 0 && index < tiles.length; index += delta) {
    const tile = tiles[index];

    if (tile?.kind === 'item' && (column === null || tile.column === column)) return tile;
  }

  return null;
};

/**
 * Соседняя плитка ленты GIF по раскладке, а не по DOM: в документе только окно плиток, и порядок
 * его узлов не обязан совпадать с порядком ленты.
 *
 * Участвуют только плитки элементов: заголовки и заглушки загрузки пропускаются. Влево и вправо —
 * порядок выдачи, в том числе через границу разделов; вверх и вниз — предыдущая и следующая
 * плитка той же колонки: в колонке плитки идут в порядке выдачи сверху вниз, и в следующем
 * разделе колонка продолжается.
 *
 * @param tiles — плитки раскладки в порядке выдачи
 * @param id — id кнопки текущей ячейки
 * @param direction — направление шага
 * @param idOf — id кнопки ячейки по разделу и элементу
 * @returns плитка соседа; `null` — край ленты или ячейки нет в раскладке
 */
export const masonryNeighbor = <T>(
  tiles: readonly MasonryTile<T>[],
  id: string,
  direction: PreviewDirection,
  idOf: CellIdOf<T>
): ItemTile<T> | null => {
  for (const [index, tile] of tiles.entries()) {
    if (tile.kind !== 'item' || idOf(tile.sectionId, tile.item) !== id) continue;

    switch (direction) {
      case 'left': {
        return nearestItem(tiles, index, -1, null);
      }

      case 'right': {
        return nearestItem(tiles, index, 1, null);
      }

      case 'up': {
        return nearestItem(tiles, index, -1, tile.column);
      }

      case 'down': {
        return nearestItem(tiles, index, 1, tile.column);
      }

      default: {
        throw new Error(`Неизвестное направление: ${String(direction)}`);
      }
    }
  }

  return null;
};
