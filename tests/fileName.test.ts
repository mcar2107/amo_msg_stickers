import { describe, expect, it } from 'vitest';

import type { SendItem } from '@core/db.types';
import {
  buildStickerFileName,
  parseStickerFileName,
  sanitizeLabel,
  sendFileName,
} from '@core/fileName';
import type {
  ParsedStickerFileName,
  StickerFileKind,
  StickerFileNameParams,
  StickerLabelSource,
} from '@core/fileName.types';

const SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const FAMILY = '👨\u200D👩\u200D👧';

/**
 * Графемы строки — так их считает спека: составной эмодзи и буква с диакритикой — один символ.
 *
 * @param text — строка
 * @returns графемы по порядку
 */
const graphemes = (text: string): string[] => {
  return Array.from(SEGMENTER.segment(text), ({ segment }) => {
    return segment;
  });
};

/**
 * Длина строки в байтах UTF-8.
 *
 * @param text — строка
 * @returns число байт
 */
const utf8Bytes = (text: string): number => {
  return new TextEncoder().encode(text).length;
};

describe('sanitizeLabel', () => {
  it.each([
    ['точки и слеши', 'a.b/c', 'abc'],
    ['перевод строки', 'При\nвет', 'Привет'],
    ['возврат каретки и табуляция', 'a\r\tb', 'ab'],
    ['U+202E', 'cat\u202Egif.exe', 'catgifexe'],
    [
      'bidi U+202A–U+202D и U+2066–U+2069',
      '\u202Aa\u202Bb\u202Cc\u202Dd\u2066e\u2067f\u2068g\u2069',
      'abcdefg',
    ],
    ['U+200E (LRM)', 'a\u200Eb', 'ab'],
    ['U+200F (RLM)', 'a\u200Fb', 'ab'],
    ['U+061C (ALM)', 'a\u061Cb', 'ab'],
    ['пробелы по краям', '  Привет  ', 'Привет'],
    ['пробелы по краям после вычистки', '. Привет /', 'Привет'],
  ])('вычищает: %s', (_name, raw, expected) => {
    expect(sanitizeLabel(raw)).toBe(expected);
  });

  it('не трогает ZWJ внутри составного эмодзи', () => {
    expect(sanitizeLabel(FAMILY)).toBe(FAMILY);
  });

  it.each([
    ['пустая', ''],
    ['из пробелов', '   '],
    ['из одних точек и слешей', './/.'],
    ['из управляющих символов', '\n\u202E\u0000'],
  ])('метка %s — пустая строка', (_name, raw) => {
    expect(sanitizeLabel(raw)).toBe('');
  });

  it('обрезает строку длиннее 32 символов до первых 32', () => {
    const raw = 'abcdefghijklmnopqrstuvwxyz0123456789';

    expect(sanitizeLabel(raw)).toBe('abcdefghijklmnopqrstuvwxyz012345');
  });

  it('берёт составной эмодзи на 32-й позиции целиком', () => {
    const letters = 'a'.repeat(31);
    const result = sanitizeLabel(`${letters}${FAMILY}bcd`);

    expect(result).toBe(`${letters}${FAMILY}`);
    expect(graphemes(result)).toHaveLength(32);
    expect(graphemes(result).at(-1)).toBe(FAMILY);
  });

  it('обрезает пробел, оказавшийся на месте обрезки', () => {
    const letters = 'б'.repeat(31);
    const result = sanitizeLabel(`${letters} продолжение`);

    expect(result).toBe(letters);
    expect(graphemes(result)).toHaveLength(31);
    expect(result.endsWith(' ')).toBe(false);
  });

  it('держит потолок 128 байт, не разрезая графему', () => {
    /**
     * Графема из буквы и трёх комбинирующих знаков — 8 байт UTF-8: 20 штук дают 160 байт при 20 графемах.
     */
    const heavy = 'е\u0301\u0302\u0303';
    const result = sanitizeLabel(heavy.repeat(20));

    expect(utf8Bytes(heavy)).toBe(8);
    expect(utf8Bytes(result)).toBe(128);
    expect(result).toBe(heavy.repeat(16));
  });

  it('заканчивает метку на графеме, упёршейся в 128 байт, — следующая лёгкая не попадает', () => {
    /**
     * 31 эмодзи — 124 байта: 8-байтная графема не влезает, а однобайтная `a` после неё влезла бы и по байтам, и по
     * числу графем.
     */
    const heavy = 'е́̂̃';
    const head = '😀'.repeat(31);

    expect(sanitizeLabel(`${head}${heavy}a`)).toBe(head);
  });

  it('не берёт графему, которая одна больше 128 байт', () => {
    const giant = `a${'\u0301'.repeat(100)}`;

    expect(sanitizeLabel(`ok${giant}`)).toBe('ok');
  });

  it('вмещает 32 графемы кириллицы и 32 простых эмодзи', () => {
    const cyrillic = 'ж'.repeat(40);
    const emoji = '😀'.repeat(40);

    expect(sanitizeLabel(cyrillic)).toBe('ж'.repeat(32));
    expect(utf8Bytes(sanitizeLabel(emoji))).toBe(128);
    expect(sanitizeLabel(emoji)).toBe('😀'.repeat(32));
  });
});

describe('buildStickerFileName', () => {
  it.each([
    [
      'стикер Telegram с эмодзи',
      { kind: 'sticker', label: '😀' },
      '😀.amostk.k-sticker.gif',
    ],
    [
      'свой стикер с подписью',
      { kind: 'sticker', label: 'Привет' },
      'Привет.amostk.k-sticker.gif',
    ],
    ['GIF из поиска', { kind: 'gif', label: 'cat' }, 'cat.amostk.k-gif.gif'],
    ['стикер без метки', { kind: 'sticker', label: '' }, 'amostk.k-sticker.gif'],
    ['GIF без метки', { kind: 'gif', label: '' }, 'amostk.k-gif.gif'],
    [
      'метка с точками и слешами',
      { kind: 'gif', label: 'a.b/c' },
      'abc.amostk.k-gif.gif',
    ],
    ['метка из пробелов', { kind: 'sticker', label: '   ' }, 'amostk.k-sticker.gif'],
    [
      'метка с U+202E и переводом строки',
      { kind: 'sticker', label: 'При\nвет\u202E' },
      'Привет.amostk.k-sticker.gif',
    ],
  ] satisfies [string, StickerFileNameParams, string][])(
    '%s',
    (_name, params, expected) => {
      expect(buildStickerFileName(params)).toBe(expected);
    }
  );

  it('длинная метка — первые 32 символа, остальные сегменты не меняются', () => {
    const name = buildStickerFileName({
      kind: 'gif',
      label: 'abcdefghijklmnopqrstuvwxyz0123456789',
    });

    expect(name).toBe('abcdefghijklmnopqrstuvwxyz012345.amostk.k-gif.gif');
  });

  it('пробел на месте обрезки не встаёт перед маркером', () => {
    const letters = 'б'.repeat(31);
    const name = buildStickerFileName({
      kind: 'sticker',
      label: `${letters} продолжение`,
    });

    expect(name).toBe(`${letters}.amostk.k-sticker.gif`);
    expect(name).not.toContain(' .amostk.');
  });

  it('составной эмодзи на 32-й позиции входит в имя целиком', () => {
    const letters = 'a'.repeat(31);

    expect(buildStickerFileName({ kind: 'sticker', label: `${letters}${FAMILY}x` })).toBe(
      `${letters}${FAMILY}.amostk.k-sticker.gif`
    );
  });

  it.each(['sticker', 'gif'] satisfies StickerFileKind[])(
    'имя вида %s с меткой и без содержит маркер и вид',
    (kind) => {
      ['', 'метка', '😀'].forEach((label) => {
        const name = buildStickerFileName({ kind, label });

        expect(name).toContain('amostk.');
        expect(name).toContain(`.k-${kind}.`);
        expect(name.endsWith('.gif')).toBe(true);
      });
    }
  );

  it('пишет параметры после вида в порядке объекта', () => {
    const name = buildStickerFileName({
      kind: 'sticker',
      label: 'x',
      params: { s: 'lg', v: '2' },
    });

    expect(name).toBe('x.amostk.k-sticker.s-lg.v-2.gif');
  });

  it.each([
    ['ключ k', { k: 'gif' }],
    ['ключ с цифры', { '2x': 'a' }],
    ['ключ с заглавной', { S: 'lg' }],
    ['ключ с дефисом', { 'a-b': 'c' }],
    ['пустой ключ', { '': 'a' }],
    ['значение с точкой', { s: 'l.g' }],
    ['значение с дефисом', { s: 'l-g' }],
    ['пустое значение', { s: '' }],
    ['значение с заглавной', { s: 'LG' }],
  ])('бросает на невалидном параметре: %s', (_name, params) => {
    expect(() => {
      return buildStickerFileName({ kind: 'gif', label: 'cat', params });
    }).toThrow();
  });
});

describe('parseStickerFileName', () => {
  it.each([
    ['😀.amostk.k-sticker.gif', { kind: 'sticker', label: '😀', params: {} }],
    ['Привет.amostk.k-sticker.gif', { kind: 'sticker', label: 'Привет', params: {} }],
    ['cat.amostk.k-gif.gif', { kind: 'gif', label: 'cat', params: {} }],
    ['amostk.k-sticker.gif', { kind: 'sticker', label: '', params: {} }],
    ['amostk.amostk.k-gif.gif', { kind: 'gif', label: 'amostk', params: {} }],
    [
      'amostk.k-sticker.s-lg.v-2.gif',
      { kind: 'sticker', label: '', params: { s: 'lg', v: '2' } },
    ],
    [
      'amostk.v-2.s-lg.k-sticker.gif',
      { kind: 'sticker', label: '', params: { s: 'lg', v: '2' } },
    ],
    ['amostk.k-emoji.gif', { kind: null, label: '', params: {} }],
    ['x.amostk.k-gifx.gif', { kind: null, label: 'x', params: {} }],
    ['x.amostk.s-lg.gif', { kind: null, label: 'x', params: { s: 'lg' } }],
    ['x.amostk.gif', { kind: null, label: 'x', params: {} }],
    [
      'amostk.k-gif.k-sticker.s-a.s-b.gif',
      { kind: 'gif', label: '', params: { s: 'a' } },
    ],
    [
      'amostk.k-sticker.weird.x_y-1.S-lg.-a.b-.gif',
      { kind: 'sticker', label: '', params: {} },
    ],
    ['amostk.k-sticker.v-2-3.gif', { kind: 'sticker', label: '', params: {} }],
    [
      'amostk.k-sticker.constructor-a.gif',
      { kind: 'sticker', label: '', params: { constructor: 'a' } },
    ],
    ['amostk.k-gif.webp', { kind: 'gif', label: '', params: {} }],
  ] satisfies [string, ParsedStickerFileName][])('%s', (name, expected) => {
    expect(parseStickerFileName(name)).toStrictEqual(expected);
  });

  it.each([
    ['без расширения', 'amostk.k-sticker'],
    ['последний сегмент — параметр', 'amostk.k-sticker.s-lg'],
    ['расширение с заглавной', 'amostk.k-sticker.GIF'],
    ['пустое расширение', 'amostk.k-sticker.'],
    ['без маркера', 'cat.k-gif.gif'],
    ['чужой файл', 'cat.gif'],
    ['маркер дальше сегмента 1', 'a.b.amostk.k-gif.gif'],
    ['маркер только расширением', 'cat.amostk'],
    ['пустая строка', ''],
  ])('не имя amo stickers: %s', (_name, name) => {
    expect(parseStickerFileName(name)).toBeNull();
  });

  it.each([
    { kind: 'sticker', label: '😀' },
    { kind: 'gif', label: '' },
    { kind: 'sticker', label: 'amostk' },
    { kind: 'gif', label: `${'a'.repeat(31)}${FAMILY}`, params: { s: 'lg', v: '2' } },
  ] satisfies StickerFileNameParams[])(
    'круг «сборка → разбор»: $kind «$label»',
    (params) => {
      expect(parseStickerFileName(buildStickerFileName(params))).toStrictEqual({
        kind: params.kind,
        label: params.label,
        params: params.params || {},
      });
    }
  );

  it.each([
    ['a.b/c', 'abc'],
    ['  ну привет  ', 'ну привет'],
    ['При\nвет\u202E', 'Привет'],
    [`${'б'.repeat(31)} продолжение`, 'б'.repeat(31)],
    ['./', ''],
  ])(
    'круг «сборка → разбор» с грязной меткой «%s» возвращает вычищенную',
    (raw, expected) => {
      const parsed = parseStickerFileName(
        buildStickerFileName({ kind: 'sticker', label: raw })
      );

      expect(parsed).toStrictEqual({ kind: 'sticker', label: expected, params: {} });
      expect(parsed?.label).toBe(sanitizeLabel(raw));
    }
  );

  it('круг «сборка → разбор» не зависит от порядка параметров', () => {
    const forward = buildStickerFileName({
      kind: 'gif',
      label: 'cat',
      params: { s: 'lg', v: '2' },
    });
    const backward = buildStickerFileName({
      kind: 'gif',
      label: 'cat',
      params: { v: '2', s: 'lg' },
    });

    expect(forward).not.toBe(backward);
    expect(parseStickerFileName(forward)).toStrictEqual(parseStickerFileName(backward));
  });
});

describe('sendFileName', () => {
  const localItem: SendItem = { kind: 'local', stickerId: 's1' };

  /**
   * GIF из поиска с названием или без.
   *
   * @param title — название у провайдера
   * @returns элемент отправки GIF
   */
  const remoteItem = (title?: string): SendItem => {
    return {
      kind: 'remote',
      gif: {
        id: 'g1',
        provider: 'giphy',
        title,
        url: 'https://media.giphy.com/g1.gif',
        previewUrl: 'https://media.giphy.com/g1-preview.gif',
        width: 200,
        height: 200,
      },
    };
  };

  it.each([
    ['свой стикер с подписью', { caption: 'Привет' }, 'Привет.amostk.k-sticker.gif'],
    [
      'свой стикер с подписью «ну привет»',
      { caption: 'ну привет' },
      'ну привет.amostk.k-sticker.gif',
    ],
    ['стикер Telegram с эмодзи', { emoji: '😀' }, '😀.amostk.k-sticker.gif'],
    [
      'подпись важнее эмодзи',
      { caption: 'Привет', emoji: '😀' },
      'Привет.amostk.k-sticker.gif',
    ],
    ['пустая подпись — эмодзи', { caption: '', emoji: '😀' }, '😀.amostk.k-sticker.gif'],
    ['стикер без подписи и эмодзи', {}, 'amostk.k-sticker.gif'],
  ] satisfies [string, StickerLabelSource, string][])(
    '%s',
    (_name, sticker, expected) => {
      expect(sendFileName(localItem, sticker)).toBe(expected);
    }
  );

  it('GIF из поиска с названием', () => {
    expect(sendFileName(remoteItem('cat'))).toBe('cat.amostk.k-gif.gif');
  });

  it('GIF из поиска без названия', () => {
    expect(sendFileName(remoteItem())).toBe('amostk.k-gif.gif');
  });

  it('GIF с названием a.b/c — метка abc', () => {
    expect(sendFileName(remoteItem('a.b/c'))).toBe('abc.amostk.k-gif.gif');
  });

  it('GIF из «Недавних» — вид gif, даже если передана запись стикера', () => {
    const name = sendFileName(remoteItem('cat'), { caption: 'Привет', emoji: '😀' });

    expect(name).toContain('.k-gif.');
    expect(name).not.toContain('.k-sticker.');
    expect(name).toBe('cat.amostk.k-gif.gif');
  });
});
