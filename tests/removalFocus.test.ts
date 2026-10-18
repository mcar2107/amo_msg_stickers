import { describe, expect, it } from 'vitest';

import {
  cellRemovalTargets,
  favoriteToggleTargets,
  resolveFocusTarget,
  sectionRemovalTargets,
} from '../src/core/ui/Picker/removalFocus/removalFocus';
import type { FocusSection } from '../src/core/ui/Picker/removalFocus/removalFocus.types';

/**
 * Раздел с ячейками по ключам.
 *
 * @param id — идентификатор раздела
 * @param keys — ключи ячеек в порядке показа
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

const BEFORE = [
  section('recent', ['r1', 'r2']),
  section('custom', ['a', 'b', 'c']),
  section('tg:cats', ['x']),
];

describe('cellRemovalTargets', () => {
  it('сначала следующая ячейка раздела, затем предыдущая, затем вкладки', () => {
    expect(cellRemovalTargets(BEFORE, 'custom', 'b')).toEqual([
      { kind: 'cell', sectionId: 'custom', key: 'c' },
      { kind: 'cell', sectionId: 'custom', key: 'a' },
      { kind: 'tab', sectionId: 'custom' },
      { kind: 'tab', sectionId: 'tg:cats' },
      { kind: 'tab', sectionId: 'recent' },
    ]);
  });

  it('у последней ячейки раздела следующей нет', () => {
    expect(cellRemovalTargets(BEFORE, 'custom', 'c').slice(0, 2)).toEqual([
      { kind: 'cell', sectionId: 'custom', key: 'b' },
      { kind: 'tab', sectionId: 'custom' },
    ]);
  });

  it('неизвестная ячейка — целей нет', () => {
    expect(cellRemovalTargets(BEFORE, 'custom', 'zzz')).toEqual([]);
    expect(cellRemovalTargets(BEFORE, 'nope', 'a')).toEqual([]);
  });
});

describe('sectionRemovalTargets', () => {
  it('вкладка следующего раздела, затем предыдущего', () => {
    expect(sectionRemovalTargets(BEFORE, 'custom')).toEqual([
      { kind: 'tab', sectionId: 'tg:cats' },
      { kind: 'tab', sectionId: 'recent' },
    ]);
  });

  it('у последнего раздела — только предыдущий', () => {
    expect(sectionRemovalTargets(BEFORE, 'tg:cats')).toEqual([
      { kind: 'tab', sectionId: 'custom' },
    ]);
  });
});

describe('resolveFocusTarget', () => {
  it('следующая ячейка осталась — фокус на неё', () => {
    const after = [section('recent', ['r1', 'r2']), section('custom', ['a', 'c'])];

    expect(resolveFocusTarget(cellRemovalTargets(BEFORE, 'custom', 'b'), after)).toEqual({
      kind: 'cell',
      sectionId: 'custom',
      key: 'c',
    });
  });

  it('раздел опустел и исчез — вкладка соседнего раздела', () => {
    const after = [section('custom', ['a', 'b', 'c']), section('tg:cats', ['x'])];
    const targets = cellRemovalTargets(
      [section('recent', ['r1']), ...BEFORE.slice(1)],
      'recent',
      'r1'
    );

    expect(resolveFocusTarget(targets, after)).toEqual({
      kind: 'tab',
      sectionId: 'custom',
    });
  });

  it('раздел пака опустел, но остался — его вкладка', () => {
    const after = [...BEFORE.slice(0, 2), section('tg:cats', [])];

    expect(resolveFocusTarget(cellRemovalTargets(BEFORE, 'tg:cats', 'x'), after)).toEqual(
      {
        kind: 'tab',
        sectionId: 'tg:cats',
      }
    );
  });

  it('удалённый пак — вкладка следующего раздела', () => {
    const after = [section('recent', ['r1']), section('tg:cats', ['x'])];

    expect(resolveFocusTarget(sectionRemovalTargets(BEFORE, 'custom'), after)).toEqual({
      kind: 'tab',
      sectionId: 'tg:cats',
    });
  });

  it('ни одной цели не осталось — null', () => {
    expect(resolveFocusTarget([{ kind: 'tab', sectionId: 'gone' }], BEFORE)).toBeNull();
  });
});

describe('favoriteToggleTargets', () => {
  const FEED = [
    section('favorite', ['l:f1', 'l:f2', 'l:f3']),
    section('recent', ['l:r1', 'l:r2', 'l:r3', 'l:r4', 'l:r5']),
    section('tg:cats', ['x', 'y']),
  ];

  it('убранный из «Избранного» — соседняя ячейка, которая встала на его место', () => {
    const targets = favoriteToggleTargets(FEED, 'favorite', 'l:f2', true);
    const after = [section('favorite', ['l:f1', 'l:f3']), ...FEED.slice(1)];

    expect(resolveFocusTarget(targets, after)).toEqual({
      kind: 'cell',
      sectionId: 'favorite',
      key: 'l:f3',
    });
  });

  it('последний избранный — «Избранное» исчезло, вкладка «Недавних»', () => {
    const before = [section('favorite', ['l:f1']), ...FEED.slice(1)];
    const targets = favoriteToggleTargets(before, 'favorite', 'l:f1', true);

    expect(resolveFocusTarget(targets, FEED.slice(1))).toEqual({
      kind: 'tab',
      sectionId: 'recent',
    });
  });

  it('добавленный из недавних — ячейка, которая стала третьей в «Недавних»', () => {
    const targets = favoriteToggleTargets(FEED, 'recent', 'l:r3', true);
    const after = [
      section('favorite', ['l:r3', 'l:f1', 'l:f2', 'l:f3']),
      section('recent', ['l:r1', 'l:r2', 'l:r4', 'l:r5']),
      FEED[2] || section('tg:cats', []),
    ];

    expect(resolveFocusTarget(targets, after)).toEqual({
      kind: 'cell',
      sectionId: 'recent',
      key: 'l:r4',
    });
  });

  it('ячейка пака остаётся — фокус на неё же, хотя выше появилось «Избранное»', () => {
    const before = FEED.slice(1);
    const targets = favoriteToggleTargets(before, 'tg:cats', 'y', false);

    expect(targets).toEqual([{ kind: 'cell', sectionId: 'tg:cats', key: 'y' }]);
    expect(
      resolveFocusTarget(targets, [section('favorite', ['l:y']), ...before])
    ).toEqual({
      kind: 'cell',
      sectionId: 'tg:cats',
      key: 'y',
    });
  });
});
