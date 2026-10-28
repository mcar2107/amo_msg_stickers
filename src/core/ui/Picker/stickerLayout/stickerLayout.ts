import type {
  RowRange,
  SectionTop,
  StickerLayout,
  StickerRow,
  StickerSection,
} from './stickerLayout.types';

/**
 * Высота заголовка раздела, в пикселях.
 */
const HEADER_HEIGHT = 32;

/**
 * Число колонок сетки стикеров.
 */
export const COLUMNS = 5;

/**
 * Зазор между ячейками по обеим осям, в пикселях.
 */
export const GAP = 4;

/**
 * Недолёт `scrollTop` до верха раздела, при котором раздел уже активен. Прокрутка к разделу с дробным верхом
 * (дробная сторона ячейки при полосе прокрутки Windows) браузер может округлить вниз на долю пикселя — вкладка
 * раздела, к которому перешли, всё равно должна подсветиться.
 */
const ACTIVE_SLACK = 1;

/**
 * Сторона квадратной ячейки при ширине ленты: 5 колонок и 4 зазора укладываются ровно в ширину.
 *
 * @param width — ширина ленты в пикселях
 * @returns сторона ячейки, не меньше нуля
 */
const cellSide = (width: number): number => {
  return Math.max(0, (width - GAP * (COLUMNS - 1)) / COLUMNS);
};

/**
 * Раскладывает разделы ленты стикеров в ряды с известной геометрией — окно видимых рядов считается без рендера.
 *
 * Раздел — заголовок и ряды по 5 слотов, последний ряд может быть неполным. Слот — стикер или плитка «Создать
 * стикер» после последнего стикера раздела с плиткой; полный последний ряд стикеров отдаёт плитку в новый ряд.
 * Между соседними рядами ячеек — зазор, заголовок прилегает к рядам вплотную: отступы вокруг названия — внутри
 * его высоты. Пустой раздел без плитки получает один ряд ячеек без стикеров высотой в ячейку — место под
 * подсказку.
 *
 * @param sections — разделы в порядке ленты
 * @param width — ширина ленты в пикселях, без полосы прокрутки
 * @returns ряды, верхи разделов и высота ленты
 */
export const buildStickerLayout = <T>(
  sections: StickerSection<T>[],
  width: number
): StickerLayout<T> => {
  const side = cellSide(width);
  const rows: StickerRow<T>[] = [];
  const sectionTops: SectionTop[] = [];
  let top = 0;

  for (const { id: sectionId, items, hasCreateTile } of sections) {
    sectionTops.push({ sectionId, top });
    rows.push({
      kind: 'header',
      sectionId,
      top,
      height: HEADER_HEIGHT,
      items: [],
      hasCreateTile: false,
    });
    top += HEADER_HEIGHT;

    const slots = items.length + (hasCreateTile ? 1 : 0);
    const rowCount = Math.max(1, Math.ceil(slots / COLUMNS));

    for (let index = 0; index < rowCount; index++) {
      if (index > 0) {
        top += GAP;
      }

      rows.push({
        kind: 'cells',
        sectionId,
        top,
        height: side,
        items: items.slice(index * COLUMNS, (index + 1) * COLUMNS),
        hasCreateTile: hasCreateTile && index === rowCount - 1,
      });
      top += side;
    }
  }

  return { rows, sectionTops, total: top };
};

/**
 * Номер первого элемента, для которого `isAfter` истинно, — бинпоиском. `isAfter` должна быть монотонной: ложна
 * для префикса и истинна для остатка.
 *
 * @param length — число элементов
 * @param isAfter — проверка элемента по номеру
 * @returns номер первого такого элемента, `length` — такого нет
 */
const firstIndex = (length: number, isAfter: (index: number) => boolean): number => {
  let low = 0;
  let high = length;

  while (low < high) {
    const middle = (low + high) >>> 1;

    if (isAfter(middle)) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
};

/**
 * Ряды, пересекающие видимую область с запасом. Ряд, который лишь касается границы области, в окно не входит.
 *
 * @param rows — ряды из `buildStickerLayout`
 * @param scrollTop — прокрутка ленты в пикселях, может быть отрицательной при отскоке
 * @param viewport — высота видимой области
 * @param overscan — запас сверху и снизу области
 * @returns диапазон номеров рядов `[from, to)`; `from === to` — в окне нет рядов
 */
export const visibleRows = <T>(
  rows: StickerRow<T>[],
  scrollTop: number,
  viewport: number,
  overscan: number
): RowRange => {
  const start = scrollTop - overscan;
  const end = scrollTop + viewport + overscan;
  const from = firstIndex(rows.length, (index) => {
    const { top = 0, height = 0 } = rows[index] || {};

    return top + height > start;
  });
  const to = firstIndex(rows.length, (index) => {
    const { top = 0 } = rows[index] || {};

    return top >= end;
  });

  return [from, Math.max(from, to)];
};

/**
 * Раздел, в котором находится верх видимой области: последний, чей заголовок не ниже `scrollTop`. Выше
 * первого заголовка — первый раздел.
 *
 * @param sectionTops — верхи разделов из `buildStickerLayout`
 * @param scrollTop — прокрутка ленты в пикселях
 * @returns идентификатор раздела, `null` — лента пустая
 */
export const activeSection = (
  sectionTops: SectionTop[],
  scrollTop: number
): string | null => {
  const next = firstIndex(sectionTops.length, (index) => {
    const { top = 0 } = sectionTops[index] || {};

    return top >= scrollTop + ACTIVE_SLACK;
  });
  const { sectionId } = sectionTops[Math.max(0, next - 1)] || {};

  return sectionId || null;
};
