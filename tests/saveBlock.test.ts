import { describe, expect, it } from 'vitest';

import { saveBlock } from '../src/core/ui/Picker/useStickerDraft/saveBlock';

describe('saveBlock', () => {
  it('без файла — сначала выбрать файл', () => {
    expect(saveBlock({ hasFile: false, isConverting: false })).toBe('noFile');
  });

  it('файл выбран, стикер собирается — ждать сборки', () => {
    expect(saveBlock({ hasFile: true, isConverting: true })).toBe('converting');
  });

  it('файл выбран, сборка закончена — причины нет', () => {
    expect(saveBlock({ hasFile: true, isConverting: false })).toBeNull();
  });

  it('без файла причина — файл, даже если флаг сборки ещё не снят', () => {
    expect(saveBlock({ hasFile: false, isConverting: true })).toBe('noFile');
  });
});
