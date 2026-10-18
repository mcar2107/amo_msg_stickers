import { describe, expect, it } from 'vitest';

import type { StickerRow } from '@ui/stickerLayout';
import { feedWindowRanges } from '@ui/StickersMode/feedWindowRanges';

const ROW = 100;
const VIEWPORT = 300;

/**
 * Лента из 50 рядов по 100 px: ряд `i` занимает `[i * 100, i * 100 + 100)`.
 */
const ROWS: StickerRow<string>[] = Array.from({ length: 50 }, (_, index) => {
  return {
    kind: 'cells',
    sectionId: 'tg:p',
    top: index * ROW,
    height: ROW,
    items: [],
    hasCreateTile: false,
  };
});

describe('feedWindowRanges', () => {
  it('лента стоит — запас в видимую область сверху и снизу', () => {
    expect(
      feedWindowRanges({
        rows: ROWS,
        scrollTop: 1000,
        viewport: VIEWPORT,
        glideTo: null,
        jumpTo: null,
      })
    ).toEqual([[7, 16]]);
  });

  it('лента едет вниз — запас только снизу', () => {
    expect(
      feedWindowRanges({
        rows: ROWS,
        scrollTop: 1000,
        viewport: VIEWPORT,
        glideTo: 1300,
        jumpTo: null,
      })
    ).toEqual([[10, 16]]);
  });

  it('лента едет вверх — запас только сверху', () => {
    expect(
      feedWindowRanges({
        rows: ROWS,
        scrollTop: 1000,
        viewport: VIEWPORT,
        glideTo: 700,
        jumpTo: null,
      })
    ).toEqual([[7, 13]]);
  });

  it('лента доехала до цели — запас снова с обеих сторон', () => {
    expect(
      feedWindowRanges({
        rows: ROWS,
        scrollTop: 1300,
        viewport: VIEWPORT,
        glideTo: 1300,
        jumpTo: null,
      })
    ).toEqual([[10, 19]]);
  });

  it('до прыжка готовится окно в точке прыжка — отдельно от текущего', () => {
    expect(
      feedWindowRanges({
        rows: ROWS,
        scrollTop: 0,
        viewport: VIEWPORT,
        glideTo: 4000,
        jumpTo: 3700,
      })
    ).toEqual([
      [0, 6],
      [37, 43],
    ]);
  });

  it('прыжок вверх — окно прыжка с запасом сверху, стоит перед текущим', () => {
    expect(
      feedWindowRanges({
        rows: ROWS,
        scrollTop: 4000,
        viewport: VIEWPORT,
        glideTo: 500,
        jumpTo: 800,
      })
    ).toEqual([
      [5, 11],
      [37, 43],
    ]);
  });

  it('окна текущего места и прыжка перекрываются — один диапазон', () => {
    expect(
      feedWindowRanges({
        rows: ROWS,
        scrollTop: 1000,
        viewport: VIEWPORT,
        glideTo: 1800,
        jumpTo: 1500,
      })
    ).toEqual([[10, 21]]);
  });

  it('пустая лента — пустое окно', () => {
    expect(
      feedWindowRanges({
        rows: [],
        scrollTop: 0,
        viewport: VIEWPORT,
        glideTo: null,
        jumpTo: null,
      })
    ).toEqual([[0, 0]]);
  });
});
