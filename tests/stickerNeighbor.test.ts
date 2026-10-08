import { describe, expect, it } from 'vitest';

import type { PreviewDirection } from '../src/core/ui/Picker/Preview/previewDirection/previewDirection.types';
import { stickerNeighbor } from '../src/core/ui/Picker/StickerFeed/stickerNeighbor/stickerNeighbor';
import { buildStickerLayout } from '../src/core/ui/Picker/stickerLayout/stickerLayout';
import type {
  StickerRow,
  StickerSection,
} from '../src/core/ui/Picker/stickerLayout/stickerLayout.types';

/**
 * Раздел со стикерами `<префикс>0…<префикс>{count−1}`.
 *
 * @param id — идентификатор раздела
 * @param prefix — префикс ключей стикеров
 * @param count — число стикеров
 * @param hasCreateTile — раздел заканчивается плиткой «Создать стикер»
 * @returns раздел
 */
const section = (
  id: string,
  prefix: string,
  count: number,
  hasCreateTile = false
): StickerSection<string> => {
  return {
    id,
    items: Array.from({ length: count }, (_, index) => {
      return `${prefix}${index}`;
    }),
    hasCreateTile,
  };
};

/**
 * id кнопки ячейки: ключ уникален только в разделе, поэтому в id входит раздел.
 *
 * @param sectionId — раздел ячейки
 * @param item — ключ стикера
 * @returns id ячейки
 */
const idOf = (sectionId: string, item: string): string => {
  return `${sectionId}/${item}`;
};

/**
 * Лента: недавние из трёх, «Мои стикеры» из пяти с плиткой (плитка — отдельным рядом), пустой
 * пак (ряд подсказки) и пак из шести (ряд из пяти и ряд из одного).
 */
const ROWS: StickerRow<string>[] = buildStickerLayout(
  [
    section('recent', 'r', 3),
    section('custom', 'c', 5, true),
    section('tg:empty', 'e', 0),
    section('tg:a', 'a', 6),
  ],
  316
).rows;

/**
 * id соседа в ленте `ROWS`.
 *
 * @param id — id текущей ячейки
 * @param direction — направление шага
 * @returns id соседа; `null` — соседа нет
 */
const neighbourId = (id: string, direction: PreviewDirection): string | null => {
  const neighbour = stickerNeighbor(ROWS, id, direction, idOf);

  return neighbour && idOf(neighbour.row.sectionId, neighbour.item);
};

describe('stickerNeighbor', () => {
  it('раскладка содержит ряд из одной плитки и ряд подсказки — их и пропускаем', () => {
    const empties = ROWS.filter(({ kind, items }) => {
      return kind === 'cells' && !items.length;
    });

    expect(
      empties.map(({ sectionId, hasCreateTile }) => {
        return [sectionId, hasCreateTile];
      })
    ).toEqual([
      ['custom', true],
      ['tg:empty', false],
    ]);
  });

  it.each([
    ['custom/c1', 'right', 'custom/c2'],
    ['custom/c2', 'left', 'custom/c1'],
    ['recent/r2', 'right', 'custom/c0'],
    ['custom/c0', 'left', 'recent/r2'],
    ['custom/c4', 'right', 'tg:a/a0'],
    ['tg:a/a0', 'left', 'custom/c4'],
    ['tg:a/a4', 'right', 'tg:a/a5'],
    ['tg:a/a5', 'left', 'tg:a/a4'],
  ] as const)(
    '%s, %s → %s: порядок ленты через границы разделов',
    (id, direction, expected) => {
      expect(neighbourId(id, direction)).toBe(expected);
    }
  );

  it.each([
    ['recent/r1', 'down', 'custom/c1'],
    ['custom/c3', 'up', 'recent/r2'],
    ['custom/c3', 'down', 'tg:a/a3'],
    ['tg:a/a3', 'up', 'custom/c3'],
    ['tg:a/a1', 'down', 'tg:a/a5'],
    ['tg:a/a4', 'down', 'tg:a/a5'],
    ['tg:a/a0', 'down', 'tg:a/a5'],
    ['tg:a/a5', 'up', 'tg:a/a0'],
  ] as const)(
    '%s, %s → %s: соседний ряд, колонка прижата к его длине',
    (id, direction, expected) => {
      expect(neighbourId(id, direction)).toBe(expected);
    }
  );

  it.each([
    ['recent/r0', 'left'],
    ['recent/r0', 'up'],
    ['recent/r2', 'up'],
    ['tg:a/a5', 'right'],
    ['tg:a/a5', 'down'],
  ] as const)('%s, %s — край ленты, соседа нет', (id, direction) => {
    expect(neighbourId(id, direction)).toBeNull();
  });

  it('ячейки нет в раскладке — соседа нет', () => {
    expect(neighbourId('custom/r0', 'right')).toBeNull();
    expect(stickerNeighbor([], 'recent/r0', 'right', idOf)).toBeNull();
  });

  it('сосед несёт свой ряд — по нему считается прокрутка', () => {
    const neighbour = stickerNeighbor(ROWS, 'custom/c4', 'right', idOf);
    const packRow = ROWS.find(({ sectionId, items }) => {
      return sectionId === 'tg:a' && items.length > 0;
    });

    expect(neighbour?.row).toBe(packRow);
    expect(neighbour?.item).toBe('a0');
  });
});
