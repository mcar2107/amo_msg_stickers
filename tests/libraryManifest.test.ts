import { describe, expect, it } from 'vitest';

import {
  FORMAT_VERSION,
  MAX_CAPTION_GRAPHEMES,
  MAX_FILE_STICKERS,
  MAX_TITLE_GRAPHEMES,
} from '../src/core/libraryFile/limits';
import { parseManifest } from '../src/core/libraryFile/manifest.types';

/**
 * Стикер Telegram из описания.
 *
 * @param n — номер стикера, он же имя файла
 * @returns стикер описания
 */
const tgSticker = (n: number) => {
  return { id: `tg:AgAD${n}`, file: `stickers/${n}.gif`, emoji: '😀' };
};

/**
 * Пак Telegram «Gachi» из описания.
 *
 * @param extra — поля поверх
 * @returns пак описания
 */
const tgPack = (extra: Record<string, unknown> = {}) => {
  return {
    id: 'tg:Gachi',
    source: 'telegram',
    title: 'Gachi',
    sourceRef: 'Gachi',
    coverId: 'tg:AgAD0',
    stickers: [tgSticker(0), tgSticker(1)],
    ...extra,
  };
};

/**
 * «Мои стикеры» из описания.
 *
 * @param extra — поля поверх
 * @returns пак описания
 */
const customPack = (extra: Record<string, unknown> = {}) => {
  return {
    id: 'custom',
    source: 'custom',
    title: 'Мои стикеры',
    stickers: [{ id: 'lq3k9a1zabc', file: 'stickers/10.gif', caption: 'привет' }],
    ...extra,
  };
};

/**
 * Описание версии 1.
 *
 * @param packs — паки
 * @param extra — поля поверх
 * @returns описание до разбора
 */
const manifest = (packs: unknown[], extra: Record<string, unknown> = {}) => {
  return { format: 'amo-stickers', version: 1, packs, ...extra };
};

/**
 * @param value — описание
 * @returns разобранное описание; тест падает, если разбор отказал
 */
const parsed = (value: unknown) => {
  const result = parseManifest(value);

  if (!('manifest' in result)) throw new Error(`Отказ разбора: ${result.error}`);

  return result.manifest;
};

/**
 * @param value — описание
 * @returns причина отказа; undefined — описание принято
 */
const errorOf = (value: unknown) => {
  const result = parseManifest(value);

  return 'error' in result ? result.error : undefined;
};

describe('parseManifest', () => {
  it('принимает описание версии 1 как есть', () => {
    expect(parsed(manifest([customPack(), tgPack({ createdAt: 5, usedAt: 7 })]))).toEqual(
      {
        format: 'amo-stickers',
        version: 1,
        packs: [customPack(), { ...tgPack(), createdAt: 5, usedAt: 7 }],
      }
    );
  });

  it('файл без format и с чужим форматом — не файл amo stickers', () => {
    expect(errorOf({ version: 1, packs: [tgPack()] })).toBe('notOurs');
    expect(errorOf(manifest([tgPack()], { format: 'chrome-extension' }))).toBe('notOurs');
    expect(errorOf([tgPack()])).toBe('notOurs');
    expect(errorOf(null)).toBe('notOurs');
  });

  it('версия новее своей — отдельная ошибка', () => {
    expect(errorOf(manifest([tgPack()], { version: FORMAT_VERSION + 1 }))).toBe('tooNew');
  });

  it('версия не целое от 1 — ошибка описания', () => {
    for (const version of [0, 1.5, '1', undefined]) {
      expect(errorOf(manifest([tgPack()], { version }))).toBe('invalid');
    }
  });

  it('source и id согласованы', () => {
    expect(errorOf(manifest([customPack({ id: 'tg:Gachi' })]))).toBe('invalid');
    expect(errorOf(manifest([tgPack({ id: 'custom' })]))).toBe('invalid');
    expect(errorOf(manifest([tgPack({ id: 'Gachi', sourceRef: undefined })]))).toBe(
      'invalid'
    );
    expect(errorOf(manifest([tgPack({ source: 'vk' })]))).toBe('invalid');
  });

  it('имя набора в id — по правилу имени Telegram', () => {
    expect(errorOf(manifest([tgPack({ id: 'tg:Ga-chi', sourceRef: 'Ga-chi' })]))).toBe(
      'invalid'
    );
    expect(errorOf(manifest([tgPack({ id: 'tg:', sourceRef: '' })]))).toBe('invalid');
  });

  it('sourceRef, если есть, равен имени из id', () => {
    expect(errorOf(manifest([tgPack({ sourceRef: 'Other' })]))).toBe('invalid');
    expect(errorOf(manifest([tgPack({ sourceRef: 42 })]))).toBe('invalid');
  });

  it('пак Telegram без sourceRef принимается и остаётся без него', () => {
    const { sourceRef: _, ...pack } = tgPack();
    const [result] = parsed(manifest([pack])).packs;

    expect(result).toEqual(pack);
    expect(result).not.toHaveProperty('sourceRef');
  });

  it('sourceRef своего пака не переносится', () => {
    const [result] = parsed(manifest([customPack({ sourceRef: 'Gachi' })])).packs;

    expect(result).not.toHaveProperty('sourceRef');
  });

  it('id стикера — по виду пака', () => {
    const tgInCustom = customPack({ stickers: [tgSticker(0)] });
    const customInTg = tgPack({
      coverId: undefined,
      stickers: [{ id: 'lq3k9a1zabc', file: 'stickers/0.gif' }],
    });
    const upper = customPack({ stickers: [{ id: 'ABC', file: 'stickers/0.gif' }] });
    const long = customPack({
      stickers: [{ id: 'a'.repeat(33), file: 'stickers/0.gif' }],
    });
    const tgLong = tgPack({
      stickers: [{ id: `tg:${'a'.repeat(65)}`, file: 'stickers/0.gif' }],
    });

    for (const pack of [tgInCustom, customInTg, upper, long, tgLong]) {
      expect(errorOf(manifest([pack]))).toBe('invalid');
    }
  });

  it('стикер без file или с полем не того типа — ошибка описания', () => {
    const noFile = customPack({ stickers: [{ id: 'abc' }] });
    const emptyFile = customPack({ stickers: [{ id: 'abc', file: '' }] });
    const badEmoji = customPack({ stickers: [{ id: 'abc', file: 'a.gif', emoji: 1 }] });
    const badCaption = customPack({
      stickers: [{ id: 'abc', file: 'a.gif', caption: null }],
    });
    const notObject = customPack({ stickers: ['abc'] });

    for (const pack of [noFile, emptyFile, badEmoji, badCaption, notObject]) {
      expect(errorOf(manifest([pack]))).toBe('invalid');
    }
  });

  it('пак без обязательных полей — ошибка описания', () => {
    expect(errorOf(manifest([tgPack({ title: undefined })]))).toBe('invalid');
    expect(errorOf(manifest([tgPack({ stickers: undefined })]))).toBe('invalid');
    expect(errorOf(manifest(['tg:Gachi']))).toBe('invalid');
    expect(errorOf({ format: 'amo-stickers', version: 1 })).toBe('invalid');
  });

  it('название урезается до предела по графемам', () => {
    const [pack] = parsed(manifest([tgPack({ title: '🐱'.repeat(200) })])).packs;

    expect(pack?.title).toBe('🐱'.repeat(MAX_TITLE_GRAPHEMES));
  });

  it('подпись 250 символов урезается до предела', () => {
    const caption = 'п'.repeat(250);
    const [pack] = parsed(
      manifest([customPack({ stickers: [{ id: 'abc', file: 'a.gif', caption }] })])
    ).packs;

    expect(pack?.stickers[0]?.caption).toBe('п'.repeat(MAX_CAPTION_GRAPHEMES));
  });

  it('эмодзи урезается, составной эмодзи не разрезается', () => {
    const family = '👨‍👩‍👧‍👦';
    const [pack] = parsed(
      manifest([
        customPack({
          stickers: [{ id: 'abc', file: 'a.gif', emoji: family.repeat(20) }],
        }),
      ])
    ).packs;

    expect(pack?.stickers[0]?.emoji).toBe(family.repeat(16));
  });

  it('пустые эмодзи и подпись — то же, что их нет', () => {
    const [pack] = parsed(
      manifest([
        customPack({ stickers: [{ id: 'abc', file: 'a.gif', emoji: '', caption: '' }] }),
      ])
    ).packs;

    expect(pack?.stickers[0]).toEqual({ id: 'abc', file: 'a.gif' });
  });

  it('числа времени необязательны, но если есть — конечные неотрицательные', () => {
    const [pack] = parsed(manifest([tgPack()])).packs;

    expect(pack).not.toHaveProperty('createdAt');
    expect(pack).not.toHaveProperty('usedAt');
    expect(errorOf(manifest([tgPack({ createdAt: -1 })]))).toBe('invalid');
    expect(errorOf(manifest([tgPack({ usedAt: '5' })]))).toBe('invalid');
    expect(errorOf(manifest([tgPack({ createdAt: null })]))).toBe('invalid');
  });

  it('обложка на удалённый стикер отбрасывается без ошибки', () => {
    const [pack] = parsed(manifest([tgPack({ coverId: 'tg:AgADgone' })])).packs;

    expect(pack).not.toHaveProperty('coverId');
    expect(pack?.stickers).toHaveLength(2);
  });

  it('обложка на стикер другого пака отбрасывается', () => {
    const [custom] = parsed(
      manifest([customPack({ coverId: 'tg:AgAD0' }), tgPack()])
    ).packs;

    expect(custom).not.toHaveProperty('coverId');
  });

  it('обложка не строкой — ошибка описания', () => {
    expect(errorOf(manifest([tgPack({ coverId: 0 })]))).toBe('invalid');
  });

  it('повтор пака — ошибка', () => {
    expect(errorOf(manifest([tgPack(), tgPack({ stickers: [tgSticker(5)] })]))).toBe(
      'invalid'
    );
  });

  it('повтор стикера в другом паке — ошибка', () => {
    const other = tgPack({
      id: 'tg:Other',
      sourceRef: 'Other',
      stickers: [tgSticker(0)],
    });

    expect(errorOf(manifest([tgPack(), { ...other, coverId: undefined }]))).toBe(
      'invalid'
    );
  });

  it('повтор ссылки на один file — ошибка', () => {
    const custom = customPack({ stickers: [{ id: 'abc', file: 'stickers/0.gif' }] });

    expect(errorOf(manifest([tgPack(), custom]))).toBe('invalid');
  });

  it('неизвестные поля игнорируются', () => {
    const result = parsed(
      manifest(
        [
          tgPack({
            future: true,
            stickers: [{ ...tgSticker(0), width: 512, createdAt: 1 }],
          }),
        ],
        { exportedAt: 1, settings: { giphyKey: 'x' } }
      )
    );

    expect(result).toEqual(manifest([tgPack({ stickers: [tgSticker(0)] })]));
  });

  it('пустые паки отбрасываются', () => {
    const result = parsed(manifest([customPack({ stickers: [] }), tgPack()]));

    expect(
      result.packs.map(({ id }) => {
        return id;
      })
    ).toEqual(['tg:Gachi']);
  });

  it('без единого стикера — пустой файл', () => {
    expect(errorOf(manifest([]))).toBe('empty');
    expect(errorOf(manifest([customPack({ stickers: [] })]))).toBe('empty');
  });

  it('стикеров больше предела — слишком большой файл', () => {
    /**
     * @param count — число стикеров
     * @returns описание из одного пака с `count` стикерами
     */
    const withStickers = (count: number) => {
      return manifest([
        tgPack({
          coverId: undefined,
          stickers: Array.from({ length: count }, (_, n) => {
            return tgSticker(n);
          }),
        }),
      ]);
    };

    expect(errorOf(withStickers(MAX_FILE_STICKERS))).toBeUndefined();
    expect(errorOf(withStickers(MAX_FILE_STICKERS + 1))).toBe('tooBig');
  });
});
