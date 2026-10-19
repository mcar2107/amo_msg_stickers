import { describe, expect, it } from 'vitest';

import { itemKey } from '@core/db';
import {
  FORMAT_VERSION,
  MAX_CAPTION_GRAPHEMES,
  MAX_FILE_FAVORITES,
  MAX_FILE_STICKERS,
  MAX_TITLE_GRAPHEMES,
  parseManifest,
  toSendItem,
} from '@core/libraryFile';

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

  it('имя набора — не длиннее 64 символов, как у Telegram', () => {
    const longest = 'a'.repeat(64);
    const tooLong = 'a'.repeat(65);

    expect(
      parsed(manifest([tgPack({ id: `tg:${longest}`, sourceRef: longest })]))
    ).toBeDefined();
    expect(errorOf(manifest([tgPack({ id: `tg:${tooLong}`, sourceRef: tooLong })]))).toBe(
      'invalid'
    );
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

  it('повтор пака, один из них пустой — ошибка', () => {
    expect(
      errorOf(manifest([tgPack(), tgPack({ stickers: [], coverId: undefined })]))
    ).toBe('invalid');
    expect(
      errorOf(manifest([tgPack({ stickers: [], coverId: undefined }), tgPack()]))
    ).toBe('invalid');
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

/**
 * GIF из поиска в описании.
 *
 * @param id — id у источника
 * @param extra — поля поверх
 * @returns GIF описания
 */
const gif = (id: string, extra: Record<string, unknown> = {}) => {
  return {
    provider: 'giphy',
    id,
    title: `gif ${id}`,
    url: `https://media.giphy.com/media/${id}/giphy.gif`,
    previewUrl: `https://media.giphy.com/media/${id}/200w.gif`,
    width: 480,
    height: 270,
    ...extra,
  };
};

/**
 * @param id — id у источника
 * @param ts — время
 * @param extra — поля GIF поверх
 * @returns элемент раздела с GIF
 */
const gifItem = (id: string, ts: number, extra: Record<string, unknown> = {}) => {
  return { kind: 'gif', ts, gif: gif(id, extra) };
};

/**
 * @param id — id стикера
 * @param ts — время
 * @returns элемент раздела со ссылкой на стикер
 */
const stickerRef = (id: string, ts: unknown) => {
  return { kind: 'sticker', id, ts };
};

/**
 * Избранный стикер со своим GIF — стикера нет в паках файла.
 *
 * @param extra — поля поверх
 * @returns снимок описания
 */
const snapshot = (extra: Record<string, unknown> = {}) => {
  return {
    kind: 'sticker',
    id: 'tg:Gone7',
    ts: 30,
    file: 'stickers/90.gif',
    packId: 'tg:Gone',
    emoji: '👋',
    ...extra,
  };
};

/**
 * @param sections — разделы описания
 * @param packs — паки описания
 * @returns описание с разделами
 */
const withSections = (
  sections: Record<string, unknown>,
  packs: unknown[] = [tgPack()]
) => {
  return manifest(packs, sections);
};

describe('parseManifest: избранное и недавние', () => {
  it('формат не поднят: разделы необязательные', () => {
    expect(FORMAT_VERSION).toBe(1);
  });

  it('файл без разделов читается как раньше — без полей разделов', () => {
    const result = parsed(manifest([tgPack()]));

    expect(result).not.toHaveProperty('favorites');
    expect(result).not.toHaveProperty('recent');
  });

  it('принимает ссылку на стикер пака, снимок и GIF в избранном и недавних', () => {
    const favorites = [stickerRef('tg:AgAD0', 50), snapshot(), gifItem('a', 10)];
    const recent = [stickerRef('tg:AgAD1', 40), gifItem('b', 20)];

    expect(parsed(withSections({ favorites, recent }))).toEqual({
      ...manifest([tgPack()]),
      favorites,
      recent,
    });
  });

  it('файл только с избранной GIF — не пустой', () => {
    const result = parsed(withSections({ favorites: [gifItem('a', 1)] }, []));

    expect(result.packs).toEqual([]);
    expect(result.favorites).toEqual([gifItem('a', 1)]);
  });

  it('файл только с недавней GIF — не пустой', () => {
    expect(errorOf(withSections({ recent: [gifItem('a', 1)] }, []))).toBeUndefined();
  });

  it('пустой — только без паков, избранного и недавних после отбрасываний', () => {
    expect(errorOf(withSections({ favorites: [], recent: [] }, []))).toBe('empty');
    expect(
      errorOf(
        withSections(
          { favorites: [stickerRef('tg:AgAD0', 1)], recent: [stickerRef('tg:AgAD1', 1)] },
          []
        )
      )
    ).toBe('empty');
  });

  it('ссылки на стикеры не из паков файла отбрасываются без ошибки', () => {
    const result = parsed(
      withSections({
        favorites: [stickerRef('tg:AgAD9', 3), stickerRef('tg:AgAD0', 2)],
        recent: [stickerRef('tg:AgAD9', 3), stickerRef('tg:AgAD1', 2)],
      })
    );

    expect(result.favorites).toEqual([stickerRef('tg:AgAD0', 2)]);
    expect(result.recent).toEqual([stickerRef('tg:AgAD1', 2)]);
  });

  it('ссылка на стикер пустого пака отбрасывается', () => {
    const result = parsed(
      withSections({ favorites: [stickerRef('tg:AgAD0', 1), gifItem('a', 1)] }, [
        tgPack({ stickers: [] }),
      ])
    );

    expect(result.favorites).toEqual([gifItem('a', 1)]);
  });

  it('разделы не массивом — ошибка описания', () => {
    expect(errorOf(withSections({ favorites: {} }))).toBe('invalid');
    expect(errorOf(withSections({ recent: 'x' }))).toBe('invalid');
    expect(errorOf(withSections({ favorites: null }))).toBe('invalid');
  });

  it('элемент не объект или вид не стикер и не GIF — ошибка описания', () => {
    expect(errorOf(withSections({ favorites: [1] }))).toBe('invalid');
    expect(
      errorOf(withSections({ favorites: [{ kind: 'video', id: 'x', ts: 1 }] }))
    ).toBe('invalid');
    expect(errorOf(withSections({ recent: [{ id: 'tg:AgAD0', ts: 1 }] }))).toBe(
      'invalid'
    );
  });

  it('id стикера — стикера Telegram или своего', () => {
    expect(errorOf(withSections({ favorites: [stickerRef('Tg:x y', 1)] }))).toBe(
      'invalid'
    );
    expect(errorOf(withSections({ recent: [stickerRef('', 1)] }))).toBe('invalid');
    expect(
      errorOf(withSections({ favorites: [stickerRef('lq3k9a1zabc', 1)] }, [customPack()]))
    ).toBeUndefined();
  });

  it('время обязательно и конечное неотрицательное', () => {
    expect(
      errorOf(withSections({ favorites: [{ kind: 'sticker', id: 'tg:AgAD0' }] }))
    ).toBe('invalid');
    expect(errorOf(withSections({ recent: [{ kind: 'gif', gif: gif('a') }] }))).toBe(
      'invalid'
    );
    expect(errorOf(withSections({ favorites: [gifItem('a', -1)] }))).toBe('invalid');
    expect(errorOf(withSections({ recent: [stickerRef('tg:AgAD0', Infinity)] }))).toBe(
      'invalid'
    );
    expect(errorOf(withSections({ favorites: [stickerRef('tg:AgAD0', '5')] }))).toBe(
      'invalid'
    );
  });

  it('у снимка packId — custom или tg:<имя набора>, согласованный с id стикера', () => {
    expect(errorOf(withSections({ favorites: [snapshot({ packId: undefined })] }))).toBe(
      'invalid'
    );
    expect(errorOf(withSections({ favorites: [snapshot({ packId: 'other' })] }))).toBe(
      'invalid'
    );
    expect(
      errorOf(withSections({ favorites: [snapshot({ packId: 'tg:bad name' })] }))
    ).toBe('invalid');
    expect(
      errorOf(withSections({ favorites: [snapshot({ packId: `tg:${'a'.repeat(65)}` })] }))
    ).toBe('invalid');
    expect(errorOf(withSections({ favorites: [snapshot({ packId: 'custom' })] }))).toBe(
      'invalid'
    );
    expect(
      errorOf(
        withSections({ favorites: [snapshot({ id: 'lq3k9a1zabc', packId: 'tg:Gone' })] })
      )
    ).toBe('invalid');
    expect(
      errorOf(
        withSections({ favorites: [snapshot({ id: 'lq3k9a1zabc', packId: 'custom' })] })
      )
    ).toBeUndefined();
  });

  it('у снимка file — непустая строка', () => {
    expect(errorOf(withSections({ favorites: [snapshot({ file: '' })] }))).toBe(
      'invalid'
    );
    expect(errorOf(withSections({ favorites: [snapshot({ file: 5 })] }))).toBe('invalid');
  });

  it('подпись и эмодзи снимка урезаются, пустые — то же, что их нет', () => {
    const result = parsed(
      withSections({
        favorites: [
          snapshot({ caption: 'п'.repeat(250), emoji: '😀'.repeat(20) }),
          snapshot({ id: 'tg:Gone8', file: 'stickers/91.gif', caption: '', emoji: '' }),
        ],
      })
    );

    expect(result.favorites).toEqual([
      snapshot({ caption: 'п'.repeat(MAX_CAPTION_GRAPHEMES), emoji: '😀'.repeat(16) }),
      {
        kind: 'sticker',
        id: 'tg:Gone8',
        ts: 30,
        file: 'stickers/91.gif',
        packId: 'tg:Gone',
      },
    ]);
    expect(errorOf(withSections({ favorites: [snapshot({ caption: 1 })] }))).toBe(
      'invalid'
    );
  });

  it('у GIF источник — GIPHY или KLIPY', () => {
    expect(
      errorOf(withSections({ favorites: [gifItem('a', 1, { provider: 'tenor' })] }))
    ).toBe('invalid');
    expect(
      errorOf(withSections({ favorites: [gifItem('a', 1, { provider: 'klipy' })] }))
    ).toBeUndefined();
    expect(errorOf(withSections({ recent: [{ kind: 'gif', ts: 1, gif: 'x' }] }))).toBe(
      'invalid'
    );
  });

  it('у GIF id — непустая строка до 128 символов', () => {
    expect(errorOf(withSections({ favorites: [gifItem('', 1)] }))).toBe('invalid');
    expect(errorOf(withSections({ favorites: [gifItem('a'.repeat(129), 1)] }))).toBe(
      'invalid'
    );
    expect(
      errorOf(withSections({ favorites: [gifItem('a'.repeat(128), 1)] }))
    ).toBeUndefined();
    expect(errorOf(withSections({ favorites: [gifItem('a', 1, { id: 5 })] }))).toBe(
      'invalid'
    );
  });

  it('название GIF урезается, не строкой — ошибка, пустое — то же, что его нет', () => {
    const result = parsed(
      withSections({
        favorites: [
          gifItem('a', 1, { title: 'я'.repeat(200) }),
          gifItem('b', 1, { title: '' }),
          gifItem('c', 1, { title: undefined }),
        ],
      })
    );
    const [long, empty, absent] = result.favorites || [];

    expect(long).toEqual(gifItem('a', 1, { title: 'я'.repeat(MAX_TITLE_GRAPHEMES) }));
    expect(empty).toEqual({ kind: 'gif', ts: 1, gif: gif('b', { title: undefined }) });
    expect(empty && 'gif' in empty && Object.hasOwn(empty.gif, 'title')).toBe(false);
    expect(absent && 'gif' in absent && Object.hasOwn(absent.gif, 'title')).toBe(false);
    expect(errorOf(withSections({ favorites: [gifItem('a', 1, { title: 5 })] }))).toBe(
      'invalid'
    );
  });

  it('ссылка GIF вне сетевой политики — ошибка, отдельно в url и в previewUrl', () => {
    const evil = 'https://evil.example/a.gif';

    expect(errorOf(withSections({ favorites: [gifItem('a', 1, { url: evil })] }))).toBe(
      'invalid'
    );
    expect(
      errorOf(withSections({ favorites: [gifItem('a', 1, { previewUrl: evil })] }))
    ).toBe('invalid');
    expect(
      errorOf(
        withSections({
          recent: [gifItem('a', 1, { url: 'http://media.giphy.com/a.gif' })],
        })
      )
    ).toBe('invalid');
    expect(
      errorOf(
        withSections({
          recent: [gifItem('a', 1, { previewUrl: 'https://giphy.com.evil.example/a' })],
        })
      )
    ).toBe('invalid');
    expect(errorOf(withSections({ recent: [gifItem('a', 1, { url: 5 })] }))).toBe(
      'invalid'
    );
  });

  it('ссылка GIF — до 2048 символов', () => {
    const base = 'https://media.giphy.com/';
    const atLimit = `${base}${'a'.repeat(2048 - base.length)}`;

    expect(
      errorOf(withSections({ favorites: [gifItem('a', 1, { url: atLimit })] }))
    ).toBe(undefined);
    expect(
      errorOf(withSections({ favorites: [gifItem('a', 1, { url: `${atLimit}a` })] }))
    ).toBe('invalid');
    expect(
      errorOf(
        withSections({ favorites: [gifItem('a', 1, { previewUrl: `${atLimit}a` })] })
      )
    ).toBe('invalid');
  });

  it('стороны GIF — положительные целые', () => {
    expect(errorOf(withSections({ favorites: [gifItem('a', 1, { width: 0 })] }))).toBe(
      'invalid'
    );
    expect(errorOf(withSections({ favorites: [gifItem('a', 1, { height: 1.5 })] }))).toBe(
      'invalid'
    );
    expect(errorOf(withSections({ recent: [gifItem('a', 1, { width: '480' })] }))).toBe(
      'invalid'
    );
  });

  it('повтор элемента в избранном — ошибка', () => {
    expect(
      errorOf(
        withSections({
          favorites: [stickerRef('tg:AgAD0', 1), stickerRef('tg:AgAD0', 2)],
        })
      )
    ).toBe('invalid');
    expect(
      errorOf(
        withSections({ favorites: [gifItem('a', 1), gifItem('a', 2, { title: 'x' })] })
      )
    ).toBe('invalid');
  });

  it('повтор отброшенной ссылки в избранном — тоже ошибка', () => {
    expect(
      errorOf(
        withSections({
          favorites: [stickerRef('tg:AgAD9', 1), stickerRef('tg:AgAD9', 2)],
        })
      )
    ).toBe('invalid');
  });

  it('повтор элемента в недавних — ошибка', () => {
    expect(
      errorOf(
        withSections({ recent: [stickerRef('tg:AgAD0', 1), stickerRef('tg:AgAD0', 2)] })
      )
    ).toBe('invalid');
    expect(errorOf(withSections({ recent: [gifItem('a', 1), gifItem('a', 2)] }))).toBe(
      'invalid'
    );
  });

  it('один GIF у разных источников и элемент в обоих разделах — не повтор', () => {
    expect(
      errorOf(
        withSections({
          favorites: [gifItem('a', 1), gifItem('a', 1, { provider: 'klipy' })],
          recent: [gifItem('a', 2), stickerRef('tg:AgAD0', 3)],
        })
      )
    ).toBeUndefined();
  });

  it('снимок со стикером, который есть в паке файла, — ошибка', () => {
    expect(errorOf(withSections({ favorites: [snapshot({ id: 'tg:AgAD0' })] }))).toBe(
      'invalid'
    );
  });

  it('снимок с file, занятым стикером пака или другим снимком, — ошибка', () => {
    expect(
      errorOf(withSections({ favorites: [snapshot({ file: 'stickers/1.gif' })] }))
    ).toBe('invalid');
    expect(
      errorOf(withSections({ favorites: [snapshot(), snapshot({ id: 'tg:Gone8' })] }))
    ).toBe('invalid');
  });

  it('недавних каждого вида — 40 самых поздних по времени, от новых к старым', () => {
    /**
     * Время вперемешку: самые поздние лежат не в начале массива.
     *
     * @param n — номер элемента
     * @returns время элемента
     */
    const tsOf = (n: number) => {
      return (n * 37) % 50;
    };

    const stickers = Array.from({ length: 50 }, (_, n) => {
      return tgSticker(n);
    });
    const recentStickers = stickers.map(({ id }, n) => {
      return stickerRef(id, tsOf(n));
    });
    const recentGifs = Array.from({ length: 50 }, (_, n) => {
      return gifItem(`g${n}`, tsOf(n));
    });
    const result = parsed(
      withSections({ recent: [...recentGifs, ...recentStickers] }, [
        tgPack({ coverId: undefined, stickers }),
      ])
    );
    const recent = result.recent || [];

    /**
     * @param kind — вид недавних
     * @returns время элементов вида в порядке результата
     */
    const timesOf = (kind: string) => {
      return recent.reduce<number[]>((acc, item) => {
        if (item.kind === kind) acc.push(item.ts);

        return acc;
      }, []);
    };

    const expected = Array.from({ length: 40 }, (_, n) => {
      return 49 - n;
    });

    expect(timesOf('sticker')).toEqual(expected);
    expect(timesOf('gif')).toEqual(expected);
  });

  it('урезание недавних — после отбрасывания ссылок без стикера', () => {
    const recent = [
      stickerRef('tg:AgAD9', 100),
      ...Array.from({ length: 40 }, (_, n) => {
        return gifItem(`g${n}`, n);
      }),
    ];
    const result = parsed(withSections({ recent }));

    expect(result.recent).toHaveLength(40);
  });

  it('избранного больше предела — слишком большой файл', () => {
    /**
     * @param count — число избранных GIF
     * @returns описание с `count` избранными GIF
     */
    const withFavorites = (count: number) => {
      return withSections({
        favorites: Array.from({ length: count }, (_, n) => {
          return gifItem(`g${n}`, n);
        }),
      });
    };

    expect(errorOf(withFavorites(MAX_FILE_FAVORITES))).toBeUndefined();
    expect(errorOf(withFavorites(MAX_FILE_FAVORITES + 1))).toBe('tooBig');
  });

  it('снимки считаются в предел стикеров файла вместе со стикерами паков', () => {
    /**
     * @param count — число стикеров пака
     * @returns описание с паком из `count` стикеров и одним снимком
     */
    const withSnapshot = (count: number) => {
      return withSections({ favorites: [snapshot({ file: 'stickers/snapshot.gif' })] }, [
        tgPack({
          coverId: undefined,
          stickers: Array.from({ length: count }, (_, n) => {
            return tgSticker(n);
          }),
        }),
      ]);
    };

    expect(errorOf(withSnapshot(MAX_FILE_STICKERS - 1))).toBeUndefined();
    expect(errorOf(withSnapshot(MAX_FILE_STICKERS))).toBe('tooBig');
  });

  it('неизвестные поля элементов игнорируются', () => {
    const result = parsed(
      withSections({
        favorites: [{ ...stickerRef('tg:AgAD0', 1), future: 1 }],
        recent: [{ ...gifItem('a', 1), extra: true, gif: { ...gif('a'), rating: 'g' } }],
      })
    );

    expect(result.favorites).toEqual([stickerRef('tg:AgAD0', 1)]);
    expect(result.recent).toEqual([gifItem('a', 1)]);
  });
});

describe('toSendItem', () => {
  it('ключ элемента раздела — тот же, что у недавних и избранного библиотеки', () => {
    const { favorites = [] } = parsed(
      withSections({
        favorites: [
          stickerRef('tg:AgAD0', 1),
          snapshot(),
          gifItem('a', 1),
          gifItem('a', 1, { provider: 'klipy' }),
        ],
      })
    );

    expect(
      favorites.map((item) => {
        return itemKey(toSendItem(item));
      })
    ).toEqual(['l:tg:AgAD0', 'l:tg:Gone7', 'r:giphy:a', 'r:klipy:a']);
    expect(favorites[2] && toSendItem(favorites[2])).toEqual({
      kind: 'remote',
      gif: gif('a'),
    });
  });
});
