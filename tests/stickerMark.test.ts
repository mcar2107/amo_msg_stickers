import { describe, expect, it } from 'vitest';

import { markKindOf } from '../src/shared/stickerMark';
import type { StickerKind } from '../src/shared/stickerMark.types';

describe('markKindOf', () => {
  it.each([
    ['😀.amostk.k-sticker.gif', 'sticker'],
    ['amostk.k-sticker.gif', 'sticker'],
    ['cat.amostk.k-gif.gif', 'gif'],
    ['amostk.v-2.k-sticker.gif', 'sticker'],
    ['amostk.k-emoji.gif', 'gif'],
    ['x.amostk.s-lg.gif', 'gif'],
    ['x.amostk.gif', 'gif'],
  ] satisfies [string, StickerKind][])('%s — %s', (name, expected) => {
    expect(markKindOf(name)).toBe(expected);
  });

  it.each([
    ['чужая картинка', 'photo.jpg'],
    ['без маркера', 'cat.k-sticker.gif'],
    ['маркер дальше сегмента 1', 'a.b.amostk.k-sticker.gif'],
    ['без расширения', 'amostk.k-sticker'],
    ['пустая строка', ''],
  ])('не своё имя: %s', (_case, name) => {
    expect(markKindOf(name)).toBeNull();
  });
});
