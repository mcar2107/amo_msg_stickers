import { describe, expect, it } from 'vitest';

import type { StickerSection } from '@ui/stickerLayout';
import { buildStickerLayout } from '@ui/stickerLayout';
import { anchorTop } from '@ui/StickersMode/anchorTop';

/**
 * Раздел с `count` стикерами-номерами.
 *
 * @param id — идентификатор раздела
 * @param count — число стикеров
 * @returns раздел
 */
const section = (id: string, count: number): StickerSection<number> => {
  return {
    id,
    items: Array.from({ length: count }, (_, index) => {
      return index;
    }),
    hasCreateTile: false,
  };
};

const WIDTH = 336;

/**
 * Лента во время импорта: пак показан после первого стикера.
 */
const PARTIAL = buildStickerLayout(
  [section('custom', 40), section('tg:big', 120), section('tg:new', 1)],
  WIDTH
);

/**
 * Лента после импорта целиком.
 */
const FULL = buildStickerLayout(
  [
    section('custom', 40),
    section('tg:big', 120),
    section('tg:big2', 120),
    section('tg:new', 30),
  ],
  WIDTH
);

/**
 * Верх заголовка раздела в раскладке.
 *
 * @param layout — раскладка
 * @param sectionId — раздел
 * @returns верх заголовка
 */
const topOf = (layout: typeof FULL, sectionId: string): number | undefined => {
  return layout.sectionTops.find((item) => {
    return item.sectionId === sectionId;
  })?.top;
};

const ANCHOR = { sectionId: 'tg:new', seq: 1, motion: 'instant' } as const;

describe('anchorTop', () => {
  it('завершение импорта: по прежнему чтению библиотеки запрос не исполняется', () => {
    expect(
      anchorTop({ anchor: ANCHOR, appliedSeq: 0, layout: PARTIAL, isCurrent: false })
    ).toBeNull();
  });

  it('завершение импорта: после перечитывания лента встаёт на заголовок нового пака', () => {
    const top = anchorTop({
      anchor: ANCHOR,
      appliedSeq: 0,
      layout: FULL,
      isCurrent: true,
    });

    expect(top).toBe(topOf(FULL, 'tg:new'));
    expect(top).not.toBe(topOf(PARTIAL, 'tg:new'));
  });

  it('исполненный запрос не повторяется', () => {
    expect(
      anchorTop({ anchor: ANCHOR, appliedSeq: 1, layout: FULL, isCurrent: true })
    ).toBeNull();
  });

  it('повторный запрос того же раздела исполняется снова', () => {
    expect(
      anchorTop({
        anchor: { sectionId: 'tg:new', seq: 2, motion: 'smooth' },
        appliedSeq: 1,
        layout: FULL,
        isCurrent: true,
      })
    ).toBe(topOf(FULL, 'tg:new'));
  });

  it('раздела ещё нет в раскладке — запрос ждёт', () => {
    expect(
      anchorTop({
        anchor: { sectionId: 'tg:absent', seq: 1, motion: 'instant' },
        appliedSeq: 0,
        layout: FULL,
        isCurrent: true,
      })
    ).toBeNull();
  });

  it('без запроса и без раскладки прокручивать нечего', () => {
    expect(
      anchorTop({ anchor: null, appliedSeq: 0, layout: FULL, isCurrent: true })
    ).toBeNull();
    expect(
      anchorTop({ anchor: ANCHOR, appliedSeq: 0, layout: null, isCurrent: true })
    ).toBeNull();
  });
});
