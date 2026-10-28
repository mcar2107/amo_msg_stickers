import type {
  ColumnGeometry,
  MasonryLayout,
  MasonrySection,
  MasonryTile,
  SizedItem,
} from './splitColumns.types';

/**
 * Высота строки заголовка раздела, в пикселях.
 */
const HEADER_HEIGHT = 32;

/**
 * Раскладывает разделы ленты по колонкам равной ширины в пиксельные позиции. Каждый следующий элемент встаёт в
 * самую короткую колонку с учётом зазоров, при равенстве — в левую: лента читается в порядке выдачи слева направо
 * и сверху вниз, а не колонка за колонкой, как у CSS `columns`.
 *
 * Место элемента зависит только от элементов перед ним, а заглушки идут после всех элементов: дописанная в конец
 * страница не сдвигает уже показанные элементы, в том числе когда на её месте стояли заглушки.
 *
 * Заголовок раздела — строка во всю ширину под самой длинной колонкой предыдущего раздела, отступы вокруг
 * названия — внутри его высоты. Раздел без заголовка начинается через зазор под предыдущим. Заглушки — квадраты
 * в ширину колонки, поровну в конец каждой колонки: «внизу обеих колонок», а не в самой короткой.
 *
 * @param sections — разделы в порядке ленты, элементы — в порядке выдачи
 * @param geometry — число и ширина колонок, зазор
 * @returns плитки в порядке выдачи и высота ленты
 */
export const splitColumns = <T extends SizedItem>(
  sections: MasonrySection<T>[],
  geometry: ColumnGeometry
): MasonryLayout<T> => {
  const { count, width, gap } = geometry;
  const tiles: MasonryTile<T>[] = [];
  let bottom = 0;
  let hasTrailingTiles = false;

  for (const { id: sectionId, items, hasHeader, skeletons } of sections) {
    let start = bottom;

    if (hasHeader) {
      tiles.push({
        kind: 'header',
        sectionId,
        column: 0,
        top: bottom,
        height: HEADER_HEIGHT,
      });
      start = bottom + HEADER_HEIGHT;
    } else if (hasTrailingTiles) {
      start = bottom + gap;
    }

    /**
     * Верх следующей плитки в каждой колонке раздела.
     */
    const next = Array.from({ length: count }, () => {
      return start;
    });

    /**
     * Ставит плитку в колонку и сдвигает верх следующей.
     *
     * @param column — номер колонки
     * @param height — высота плитки
     * @returns верх плитки
     */
    const place = (column: number, height: number): number => {
      const top = next[column] || start;

      next[column] = top + height + gap;

      return top;
    };

    for (const item of items) {
      const column = next.indexOf(Math.min(...next));
      const height = (width * item.height) / item.width;

      tiles.push({
        kind: 'item',
        sectionId,
        item,
        column,
        top: place(column, height),
        height,
      });
    }

    for (let index = 0; index < (skeletons || 0) * count; index++) {
      const column = index % count;

      tiles.push({
        kind: 'skeleton',
        sectionId,
        index,
        column,
        top: place(column, width),
        height: width,
      });
    }

    const hasTiles = items.length > 0 || (skeletons || 0) > 0;

    if (hasTiles) {
      bottom = Math.max(...next) - gap;
      hasTrailingTiles = true;
    } else if (hasHeader) {
      bottom = start;
      hasTrailingTiles = false;
    }
  }

  return { tiles, total: bottom };
};

/**
 * Плитки, пересекающие видимую область с запасом, в порядке выдачи. Плитка, которая лишь касается границы
 * области, в окно не входит. Линейный фильтр: сотни плиток проходятся за микросекунды.
 *
 * @param tiles — плитки из `splitColumns`
 * @param scrollTop — прокрутка ленты в пикселях
 * @param viewport — высота видимой области
 * @param overscan — запас сверху и снизу области
 * @returns плитки окна
 */
export const visibleTiles = <T>(
  tiles: MasonryTile<T>[],
  scrollTop: number,
  viewport: number,
  overscan: number
): MasonryTile<T>[] => {
  const start = scrollTop - overscan;
  const end = scrollTop + viewport + overscan;

  return tiles.filter(({ top, height }) => {
    return top < end && top + height > start;
  });
};
