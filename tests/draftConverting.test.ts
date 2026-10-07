import { describe, expect, it } from 'vitest';

import { isDraftConverting } from '../src/core/ui/Picker/useStickerDraft/draftConverting';

describe('isDraftConverting', () => {
  it('без файла не собирается, что бы ни было в подписи', () => {
    expect(
      isDraftConverting({
        hasFile: false,
        caption: 'привет',
        drawnCaption: '',
        isEncoding: false,
      })
    ).toBe(false);
  });

  it('идёт кодирование — сборка', () => {
    expect(
      isDraftConverting({
        hasFile: true,
        caption: '',
        drawnCaption: '',
        isEncoding: true,
      })
    ).toBe(true);
  });

  it('подпись поправлена, задержка ещё не вышла — уже сборка', () => {
    expect(
      isDraftConverting({
        hasFile: true,
        caption: 'привет!',
        drawnCaption: 'привет',
        isEncoding: false,
      })
    ).toBe(true);
  });

  it('подпись совпадает с собранной без учёта пробелов по краям — не сборка', () => {
    expect(
      isDraftConverting({
        hasFile: true,
        caption: '  привет ',
        drawnCaption: 'привет',
        isEncoding: false,
      })
    ).toBe(false);
  });
});
