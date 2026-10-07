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

  /**
   * Значения с общим фрагментом `Zq9Secret`: утечка хоть части ключа в текст ошибки
   * ловится по фрагменту, а подстановка в любом виде — по разнице текстов между
   * значениями.
   */
  const BAD_VALUES = [
    'Zq9Secret def',
    '"Zq9Secret"',
    "Zq9Secret'X",
    'Zq9Secret\nX',
    'Zq9Secret:X',
  ];

  const errorText = (value: string): string => {
    try {
      readKlipyKey(value);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);

      return String(error);
    }

    throw new Error(`не отклонено: ${JSON.stringify(value)}`);
  };

  it.each(BAD_VALUES)('отклоняет «%s» сообщением о формате без значения', (value) => {
    const text = errorText(value);

    expect(text).toMatch(/формат/);
    expect(text).not.toContain('Zq9');
  });

  it('текст ошибки один для любых битых значений', () => {
    const texts = new Set(BAD_VALUES.map(errorText));

    expect(texts.size).toBe(1);
  });
});
