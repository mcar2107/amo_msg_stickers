import { describe, expect, it } from 'vitest';

import type { RemoteGif } from '../src/core/db.types';
import {
  gifCellTargets,
  gifClearTargets,
  gifFocusCell,
  gifFocusSections,
} from '../src/core/ui/Picker/GifView/useGifRemovalFocus/gifFocus';
import type { GifSection } from '../src/core/ui/Picker/MasonryGrid/MasonryGrid.types';
import type { FocusSection } from '../src/core/ui/Picker/removalFocus/removalFocus.types';

/**
 * GIF с номером.
 *
 * @param id — номер GIF у провайдера
 * @returns GIF
 */
const gif = (id: string): RemoteGif => {
  return {
    id,
    provider: 'giphy',
    url: `https://media.giphy.com/${id}.gif`,
    previewUrl: `https://media.giphy.com/${id}-preview.gif`,
    width: 200,
    height: 100,
  };
};

/**
 * Раздел для выбора фокуса.
 *
 * @param id — id раздела
 * @param keys — ключи ячеек
 * @returns раздел
 */
const section = (id: string, keys: string[]): FocusSection => {
  return {
    id,
    items: keys.map((key) => {
      return { key };
    }),
  };
};

describe('gifFocusSections', () => {
  it('берёт все показанные разделы, включая выдачу, с ключами GIF', () => {
    const sections: GifSection[] = [
      {
        id: 'favorite',
        title: 'Избранное',
        items: [gif('f1')],
        skeletons: 0,
        kind: 'favorite',
      },
      {
        id: 'feed',
        title: 'Тренды',
        items: [gif('t1'), gif('t2')],
        skeletons: 1,
        kind: 'feed',
      },
    ];

    expect(gifFocusSections(sections)).toEqual([
      section('favorite', ['giphy:f1']),
      section('feed', ['giphy:t1', 'giphy:t2']),
    ]);
  });
});

describe('gifCellTargets', () => {
  const BEFORE = [
    section('favorite', ['f1', 'f2', 'f3']),
    section('recent', ['r1', 'r2']),
    section('feed', ['t1', 't2']),
  ];

  it('в выдаче возвращает ту же ячейку: она остаётся', () => {
    const targets = gifCellTargets(BEFORE, 'feed', 't2');
    const after = [section('favorite', ['t2', 'f1', 'f2', 'f3']), ...BEFORE.slice(1)];

    expect(gifFocusCell(targets, after)).toEqual({ sectionId: 'feed', key: 't2' });
  });

  it('в избранном переводит фокус на следующую ячейку раздела', () => {
    const targets = gifCellTargets(BEFORE, 'favorite', 'f2');
    const after = [section('favorite', ['f1', 'f3']), ...BEFORE.slice(1)];

    expect(gifFocusCell(targets, after)).toEqual({ sectionId: 'favorite', key: 'f3' });
  });

  it('у последней ячейки раздела берёт предыдущую', () => {
    const targets = gifCellTargets(BEFORE, 'recent', 'r2');
    const after = [
      section('favorite', ['r2', 'f1', 'f2', 'f3']),
      section('recent', ['r1']),
    ];

    expect(gifFocusCell(targets, after)).toEqual({ sectionId: 'recent', key: 'r1' });
  });

  it('опустевшие недавние отдают фокус первой GIF избранного', () => {
    const before = [section('recent', ['r1']), section('feed', ['t1'])];
    const targets = gifCellTargets(before, 'recent', 'r1');
    const after = [section('favorite', ['r1']), section('feed', ['t1'])];

    expect(gifFocusCell(targets, after)).toEqual({ sectionId: 'favorite', key: 'r1' });
  });

  it('опустевшее избранное отдаёт фокус первой недавней GIF, а не выдаче', () => {
    const before = [
      section('favorite', ['f1']),
      section('recent', ['r1']),
      section('feed', ['t1']),
    ];
    const targets = gifCellTargets(before, 'favorite', 'f1');
    const after = [section('recent', ['f1', 'r1']), section('feed', ['t1'])];

    expect(gifFocusCell(targets, after)).toEqual({ sectionId: 'recent', key: 'f1' });
  });

  it('без избранного и недавних после правки цели нет — фокус в поле поиска', () => {
    const before = [section('favorite', ['f1']), section('feed', ['t1'])];
    const targets = gifCellTargets(before, 'favorite', 'f1');

    expect(gifFocusCell(targets, [section('feed', ['t1'])])).toBeNull();
  });
});

describe('gifClearTargets', () => {
  it('после «Очистить» фокус на первой GIF избранного', () => {
    const after = [section('favorite', ['f1', 'f2']), section('feed', ['t1'])];

    expect(gifFocusCell(gifClearTargets(), after)).toEqual({
      sectionId: 'favorite',
      key: 'f1',
    });
  });

  it('без избранного цели нет', () => {
    expect(gifFocusCell(gifClearTargets(), [section('feed', ['t1'])])).toBeNull();
  });
});
