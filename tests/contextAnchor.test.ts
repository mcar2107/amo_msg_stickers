import { describe, expect, it } from 'vitest';

import { contextAnchor } from '@ui/Menu/contextAnchor';

const CELL = { left: 100, top: 200, right: 164, bottom: 264 };

describe('contextAnchor', () => {
  it('правый клик внутри ячейки — меню от точки клика', () => {
    expect(contextAnchor({ left: 120, top: 230 }, CELL)).toEqual({
      left: 120,
      top: 230,
      right: 120,
      bottom: 230,
    });
  });

  it('точка на краю ячейки считается внутри', () => {
    expect(contextAnchor({ left: 164, top: 264 }, CELL)).toEqual({
      left: 164,
      top: 264,
      right: 164,
      bottom: 264,
    });
  });

  it('точка вне ячейки (меню с клавиатуры) — меню от ячейки', () => {
    expect(contextAnchor({ left: 0, top: 0 }, CELL)).toEqual(CELL);
  });
});
