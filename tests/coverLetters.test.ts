import { describe, expect, it } from 'vitest';

import { coverLetters } from '@ui/PackCover/coverLetters';

describe('coverLetters', () => {
  it('берёт первые две буквы названия', () => {
    expect(coverLetters('Котики')).toBe('Ко');
  });

  it('не разрывает эмодзи вне BMP', () => {
    expect(coverLetters('К😀 пак')).toBe('К😀');
  });

  it('эмодзи из нескольких символов считает одной буквой', () => {
    expect(coverLetters('👨‍👩‍👧🇷🇺 семья')).toBe('👨‍👩‍👧🇷🇺');
  });

  it('короткое название отдаёт целиком', () => {
    expect(coverLetters('A')).toBe('A');
  });
});
