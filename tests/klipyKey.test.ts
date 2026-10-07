import { describe, expect, it } from 'vitest';

import { readKlipyKey } from '../scripts/klipyKey';

describe('readKlipyKey', () => {
  it.each([undefined, '', '  \n'])('без значения («%s») — пустая строка', (value) => {
    expect(readKlipyKey(value)).toBe('');
  });

  it('отдаёт валидный ключ как есть', () => {
    expect(readKlipyKey('abcXYZ123_-q')).toBe('abcXYZ123_-q');
  });

  it('обрезает пробелы и перевод строки вокруг ключа', () => {
    expect(readKlipyKey(' abcXYZ123\r\n')).toBe('abcXYZ123');
    expect(readKlipyKey('\nabcXYZ123\n')).toBe('abcXYZ123');
  });

  it.each(['abc def', '"abcXYZ123"', "abc'XYZ", 'abc\nXYZ', 'abc:XYZ'])(
    'отклоняет «%s» без самого значения в тексте ошибки',
    (value) => {
      let error: unknown;

      try {
        readKlipyKey(value);
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(Error);
      expect(String(error)).toMatch(/формат/);
      expect(String(error)).not.toContain(value);
    }
  );
});
