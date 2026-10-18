import { describe, expect, it } from 'vitest';

import { LINE_HEIGHT_PX, wheelDeltaPx } from '@ui/StickersMode/wheelDeltaPx';

const PAGE_HEIGHT = 480;

describe('wheelDeltaPx', () => {
  it('пиксели — как есть, со знаком', () => {
    expect(wheelDeltaPx({ delta: 120, deltaMode: 0, pageHeight: PAGE_HEIGHT })).toBe(120);
    expect(wheelDeltaPx({ delta: -300, deltaMode: 0, pageHeight: PAGE_HEIGHT })).toBe(
      -300
    );
  });

  it('строки — на высоту строки', () => {
    expect(wheelDeltaPx({ delta: 3, deltaMode: 1, pageHeight: PAGE_HEIGHT })).toBe(
      3 * LINE_HEIGHT_PX
    );
    expect(wheelDeltaPx({ delta: -1, deltaMode: 1, pageHeight: PAGE_HEIGHT })).toBe(
      -LINE_HEIGHT_PX
    );
  });

  it('страницы — на высоту видимой области', () => {
    expect(wheelDeltaPx({ delta: 1, deltaMode: 2, pageHeight: PAGE_HEIGHT })).toBe(
      PAGE_HEIGHT
    );
    expect(wheelDeltaPx({ delta: -2, deltaMode: 2, pageHeight: PAGE_HEIGHT })).toBe(
      -2 * PAGE_HEIGHT
    );
  });

  it('неизвестный режим — как пиксели', () => {
    expect(wheelDeltaPx({ delta: 50, deltaMode: 7, pageHeight: PAGE_HEIGHT })).toBe(50);
  });
});
