import type { PreviewDirection } from '../../Preview/previewDirection/previewDirection.types';
import type { MasonryTile } from '../splitColumns/splitColumns.types';

import type { MasonryItemTile, TileIdOf } from './masonryNeighbor.types';

/**
 * Первая плитка той же колонки, идя от `from` с шагом `delta`.
 *
 * @param items — плитки элементов в порядке выдачи
 * @param from — номер текущей плитки
 * @param delta — `-1` — вверх, `1` — вниз
 * @returns плитка той же колонки или `null`
 */
const sameColumn = <T>(
  items: readonly MasonryItemTile<T>[],
  from: number,
  delta: -1 | 1
): MasonryItemTile<T> | null => {
  const { column } = items[from] || {};

  for (let index = from + delta; index >= 0 && index < items.length; index += delta) {
    const tile = items[index];

    if (tile && tile.column === column) return tile;
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
  idOf: TileIdOf<T>
): MasonryItemTile<T> | null => {
  const items = tiles.filter((tile): tile is MasonryItemTile<T> => {
    return tile.kind === 'item';
  });
  const index = items.findIndex(({ sectionId, item }) => {
    return idOf(sectionId, item) === id;
  });

  if (index < 0) return null;

  switch (direction) {
    case 'left': {
      return items[index - 1] || null;
    }

    case 'right': {
      return items[index + 1] || null;
    }

    case 'up': {
      return sameColumn(items, index, -1);
    }

    case 'down': {
      return sameColumn(items, index, 1);
    }

    default: {
      throw new Error(`Неизвестное направление: ${String(direction)}`);
    }
  }
};
