import { describe, expect, it } from 'vitest';

import type { StickerSection } from '@ui/stickerLayout';
import { buildStickerLayout } from '@ui/stickerLayout';
import { feedActiveSection } from '@ui/StickersMode/feedActiveSection';

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

/**
 * Длинный пак и короткий последний: заголовок последнего не может встать вверх ленты высотой 300.
 */
const LAYOUT = buildStickerLayout(
  [section('recent', 10), section('custom', 40), section('tg:short', 3)],
  336
);
const VIEWPORT = 300;
const END = LAYOUT.total - VIEWPORT;

describe('feedActiveSection', () => {
  it('в начале ленты — первый раздел', () => {
    expect(feedActiveSection(LAYOUT, 0, VIEWPORT)).toBe('recent');
  });

  it('в середине ленты — раздел в верху видимой области', () => {
    const { top = 0 } = LAYOUT.sectionTops[1] || {};

    expect(feedActiveSection(LAYOUT, top + 10, VIEWPORT)).toBe('custom');
  });

  it('лента прокручена до конца — последний раздел, хотя его заголовок ниже верха', () => {
    const { top = 0 } = LAYOUT.sectionTops[2] || {};

    expect(END).toBeLessThan(top);
    expect(feedActiveSection(LAYOUT, END, VIEWPORT)).toBe('tg:short');
  });

  it('недолёт до конца меньше пикселя — тоже конец ленты', () => {
    expect(feedActiveSection(LAYOUT, END - 0.5, VIEWPORT)).toBe('tg:short');
  });

  it('за пиксель и больше до конца — раздел в верху видимой области', () => {
    expect(feedActiveSection(LAYOUT, END - 2, VIEWPORT)).toBe('custom');
  });

  it('лента короче видимой области — первый раздел, а не последний', () => {
    const short = buildStickerLayout([section('recent', 2), section('custom', 2)], 336);

    expect(feedActiveSection(short, 0, VIEWPORT)).toBe('recent');
  });

  it('высота области неизвестна (панель скрыта) — раздел в верху', () => {
    expect(feedActiveSection(LAYOUT, 0, 0)).toBe('recent');
  });

  it('разделов нет — null', () => {
    expect(feedActiveSection(buildStickerLayout([], 336), 0, VIEWPORT)).toBeNull();
  });
});
