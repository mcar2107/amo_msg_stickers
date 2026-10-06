import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../src/core/host';
import { setLocale } from '../src/core/i18n/translate';
import { BYTES_IN_MB as MB, httpError } from '../src/core/net';
import { checkGifKey, fetchGifs } from '../src/core/sources/gifs';

import { fakeHost } from './helpers/fakeHost';

const SETTINGS = { ...DEFAULT_SETTINGS, giphyKey: 'g', klipyKey: 'k' };

const giphyImage = (url: string) => {
  return { url, width: '200', height: '100' };
};

const giphyPage = (data: unknown[]) => {
  return { data, pagination: { offset: 0, count: data.length, total_count: 100 } };
};

const tenorMedia = (url: string) => {
  return { url, dims: [220, 110] };
};

/**
 * Вес версии по имени: число — в МБ, строка — сырое значение поля `size`, null — поля нет.
 */
type Sizes = Record<string, number | string | null>;

/**
 * Элемент выдачи GIPHY с весом у каждого рендишна. Превью — `fixed_width_small` без веса:
 * к версии для отправки оно отношения не имеет.
 *
 * @param sizes — вес рендишна по имени
 * @param extra — рендишны, добавленные как есть
 * @returns ответ API
 */
const giphyWeighted = (sizes: Sizes, extra: Record<string, unknown> = {}) => {
  const images = Object.entries(sizes).reduce<Record<string, unknown>>(
    (acc, [name, size]) => {
      const image = giphyImage(`https://media.giphy.com/w/${name}.gif`);

      acc[name] =
        size === null
          ? image
          : {
              ...image,
              size: typeof size === 'number' ? String(Math.round(size * MB)) : size,
            };

      return acc;
    },
    { fixed_width_small: giphyImage('https://media.giphy.com/w/preview.gif'), ...extra }
  );

  return giphyPage([{ id: 'w', images }]);
};

/**
 * Ответ KLIPY с одним элементом и весом у каждого формата.
 *
 * @param sizes — вес формата по имени
 * @param extra — форматы, добавленные как есть
 * @returns ответ API
 */
const klipyWeighted = (sizes: Sizes, extra: Record<string, unknown> = {}) => {
  const formats = Object.entries(sizes).reduce<Record<string, unknown>>(
    (acc, [name, size]) => {
      const media = tenorMedia(`https://static.klipy.com/w/${name}.gif`);

      acc[name] =
        size === null
          ? media
          : { ...media, size: typeof size === 'number' ? Math.round(size * MB) : size };

      return acc;
    },
    { ...extra }
  );

  return { results: [{ id: 'w', media_formats: formats }] };
};

const sentUrl = async (json: unknown, feed: 'giphy-gifs' | 'klipy') => {
  const { items } = await fetchGifs(fakeHost({ json }), SETTINGS, feed, '', null, 'ru');

  return items[0]?.url;
};

describe('fetchGifs: GIPHY', () => {
  it('нормализует элемент выдачи', async () => {
    const host = fakeHost({
      json: giphyPage([
        {
          id: 'a',
          images: {
            fixed_width_small: giphyImage('https://media.giphy.com/a/small.gif'),
            downsized: giphyImage('https://media.giphy.com/a/downsized.gif'),
            original: giphyImage('https://media.giphy.com/a/original.gif'),
          },
        },
      ]),
    });

    const page = await fetchGifs(host, SETTINGS, 'giphy-gifs', '', null, 'ru');

    expect(page).toEqual({
      items: [
        {
          id: 'a',
          provider: 'giphy',
          url: 'https://media.giphy.com/a/downsized.gif',
          previewUrl: 'https://media.giphy.com/a/small.gif',
          width: 200,
          height: 100,
        },
      ],
      next: '1',
    });
  });

  it('отбрасывает элемент без рендишна и элемент с чужим хостом', async () => {
    const host = fakeHost({
      json: giphyPage([
        { id: 'no-images', images: {} },
        { id: 'evil', images: { original: giphyImage('https://evil.example/x.gif') } },
        { id: 'broken' },
        { id: 'ok', images: { original: giphyImage('https://i.giphy.com/ok.gif') } },
      ]),
    });

    const { items } = await fetchGifs(
      host,
      SETTINGS,
      'giphy-stickers',
      'кот',
      null,
      'ru'
    );

    expect(
      items.map(({ id }) => {
        return id;
      })
    ).toEqual(['ok']);
  });

  it.each([
    {},
    { data: [] },
    { data: 'x', pagination: { offset: 0, count: 0, total_count: 0 } },
    { data: [], pagination: {} },
    { data: [], pagination: { offset: '0', count: 0, total_count: 0 } },
    null,
    'html',
  ])('битый ответ %j — ошибка источника', async (json) => {
    await expect(
      fetchGifs(fakeHost({ json }), SETTINGS, 'giphy-gifs', '', null, 'ru')
    ).rejects.toThrow('GIPHY: неожиданный ответ');
  });
});

describe('fetchGifs: версия GIPHY для отправки по весу', () => {
  it('версия до 2 МБ побеждает тяжёлую', async () => {
    const json = giphyWeighted({ original: 7, downsized: 1.9, fixed_height: 1.4 });

    expect(await sentUrl(json, 'giphy-gifs')).toBe(
      'https://media.giphy.com/w/downsized.gif'
    );
  });

  it('из нескольких до 2 МБ — самая тяжёлая', async () => {
    const json = giphyWeighted({
      original: 5,
      fixed_height: 1.2,
      fixed_width: 1.8,
      fixed_height_small: 0.3,
    });

    expect(await sentUrl(json, 'giphy-gifs')).toBe(
      'https://media.giphy.com/w/fixed_width.gif'
    );
  });

  it('нет версии до 2 МБ — самая лёгкая до 8 МБ', async () => {
    const json = giphyWeighted({ original: 11, downsized_large: 7, downsized_medium: 3 });

    expect(await sentUrl(json, 'giphy-gifs')).toBe(
      'https://media.giphy.com/w/downsized_medium.gif'
    );
  });

  it('все тяжелее 8 МБ — самая лёгкая', async () => {
    const json = giphyWeighted({ original: 12, downsized_large: 9 });

    expect(await sentUrl(json, 'giphy-gifs')).toBe(
      'https://media.giphy.com/w/downsized_large.gif'
    );
  });

  it('равный вес — первая по списку кандидатов', async () => {
    const json = giphyWeighted({ fixed_width: 1.5, fixed_height: 1.5 });

    expect(await sentUrl(json, 'giphy-gifs')).toBe(
      'https://media.giphy.com/w/fixed_height.gif'
    );
  });

  it('версия с весом вне сетевой политики пропускается', async () => {
    const json = giphyWeighted(
      { original: 7, fixed_height: 1.4 },
      {
        downsized: {
          ...giphyImage('https://evil.example/downsized.gif'),
          size: String(1.9 * MB),
        },
      }
    );

    expect(await sentUrl(json, 'giphy-gifs')).toBe(
      'https://media.giphy.com/w/fixed_height.gif'
    );
  });

  it.each([null, 'abc', '0', '-1'])(
    'выдача без пригодного веса (%j) — прежний выбор по имени',
    async (size) => {
      const json = giphyWeighted({ original: size, downsized: size, fixed_height: size });

      expect(await sentUrl(json, 'giphy-gifs')).toBe(
        'https://media.giphy.com/w/downsized.gif'
      );
    }
  );

  it('вес числом, а не строкой, — веса нет', async () => {
    const json = giphyWeighted(
      {},
      {
        original: { ...giphyImage('https://media.giphy.com/w/original.gif'), size: 5000 },
        downsized: {
          ...giphyImage('https://media.giphy.com/w/downsized.gif'),
          size: 1000,
        },
      }
    );

    expect(await sentUrl(json, 'giphy-gifs')).toBe(
      'https://media.giphy.com/w/downsized.gif'
    );
  });
});

describe('fetchGifs: KLIPY', () => {
  it('нормализует элемент и курсор', async () => {
    const host = fakeHost({
      json: {
        results: [
          {
            id: 'k',
            media_formats: {
              tinygif: tenorMedia('https://static.klipy.com/k/tiny.gif'),
              gif: tenorMedia('https://static.klipy.com/k/full.gif'),
            },
          },
        ],
        next: 'CURSOR',
      },
    });

    const page = await fetchGifs(host, SETTINGS, 'klipy', '', null, 'ru');

    expect(page).toEqual({
      items: [
        {
          id: 'k',
          provider: 'klipy',
          url: 'https://static.klipy.com/k/full.gif',
          previewUrl: 'https://static.klipy.com/k/tiny.gif',
          width: 220,
          height: 110,
        },
      ],
      next: 'CURSOR',
    });
  });

  it('отбрасывает элемент со ссылкой вне klipy.com и без dims', async () => {
    const host = fakeHost({
      json: {
        results: [
          {
            id: 'evil',
            media_formats: { gif: tenorMedia('https://cdn.evil.example/x.gif') },
          },
          {
            id: 'no-dims',
            media_formats: { gif: { url: 'https://static.klipy.com/x.gif' } },
          },
        ],
      },
    });

    const page = await fetchGifs(host, SETTINGS, 'klipy', 'кот', 'CURSOR', 'ru');

    expect(page).toEqual({ items: [], next: null });
  });

  it('битый ответ — ошибка источника', async () => {
    await expect(
      fetchGifs(fakeHost({ json: { results: {} } }), SETTINGS, 'klipy', '', null, 'ru')
    ).rejects.toThrow('KLIPY: неожиданный ответ');
  });

  it('в английском интерфейсе битый ответ — английский текст', async () => {
    setLocale('en');

    await expect(
      fetchGifs(fakeHost({ json: { results: {} } }), SETTINGS, 'klipy', '', null, 'en')
    ).rejects.toThrow('KLIPY: unexpected response');
  });
  it('запрашивает все форматы-кандидаты', async () => {
    const urls: string[] = [];
    const host = fakeHost({
      onJson: (url) => {
        urls.push(url);

        return { results: [] };
      },
    });

    await fetchGifs(host, SETTINGS, 'klipy', 'кот', null, 'ru');

    expect(new URL(urls[0] || '').searchParams.get('media_filter')).toBe(
      'gif,mediumgif,tinygif,nanogif'
    );
  });
});

describe('fetchGifs: версия KLIPY для отправки по весу', () => {
  it('версия до 2 МБ побеждает тяжёлые', async () => {
    const json = klipyWeighted({ gif: 13, mediumgif: 5, tinygif: 1.4 });

    expect(await sentUrl(json, 'klipy')).toBe('https://static.klipy.com/w/tinygif.gif');
  });

  it('из нескольких до 2 МБ — самая тяжёлая', async () => {
    const json = klipyWeighted({ gif: 9, mediumgif: 1.9, tinygif: 0.5, nanogif: 0.1 });

    expect(await sentUrl(json, 'klipy')).toBe('https://static.klipy.com/w/mediumgif.gif');
  });

  it('нет версии до 2 МБ — самая лёгкая до 8 МБ', async () => {
    const json = klipyWeighted({ gif: 13, mediumgif: 3, tinygif: 5 });

    expect(await sentUrl(json, 'klipy')).toBe('https://static.klipy.com/w/mediumgif.gif');
  });

  it('все тяжелее 8 МБ — самая лёгкая', async () => {
    const json = klipyWeighted({ gif: 17, mediumgif: 10 });

    expect(await sentUrl(json, 'klipy')).toBe('https://static.klipy.com/w/mediumgif.gif');
  });

  it('равный вес — первая по списку кандидатов', async () => {
    const json = klipyWeighted({ tinygif: 1, gif: 1 });

    expect(await sentUrl(json, 'klipy')).toBe('https://static.klipy.com/w/gif.gif');
  });

  it('версия с весом вне сетевой политики пропускается', async () => {
    const json = klipyWeighted(
      { gif: 13, tinygif: 0.5 },
      {
        mediumgif: {
          ...tenorMedia('https://cdn.evil.example/medium.gif'),
          size: 1.9 * MB,
        },
      }
    );

    expect(await sentUrl(json, 'klipy')).toBe('https://static.klipy.com/w/tinygif.gif');
  });

  /**
   * Без `gif` прежний выбор по имени даёт `tinygif`, а выбор по весу при равном весе —
   * `mediumgif`: так тест отличает «веса нет» от «вес принят».
   */
  it.each([null, 'abc', '1000', 0, -1])(
    'выдача без пригодного веса (%j) — прежний выбор по имени',
    async (size) => {
      const json = klipyWeighted({ mediumgif: size, tinygif: size });

      expect(await sentUrl(json, 'klipy')).toBe('https://static.klipy.com/w/tinygif.gif');
    }
  );
});

afterEach(() => {
  setLocale('ru');
});

describe('fetchGifs: язык выдачи', () => {
  /**
   * Параметры первого запроса к источнику.
   *
   * @param host — фейковое окружение после запроса
   * @returns параметры адреса запроса
   */
  const requestParams = (host: ReturnType<typeof fakeHost>) => {
    const [[url]] = vi.mocked(host.fetchJson).mock.calls as [[string]];

    return new URL(url).searchParams;
  };

  it.each([
    ['ru', 'ru'],
    ['en', 'en'],
  ] as const)('поиск GIPHY GIF и стикеров уходит с lang=%s', async (locale, lang) => {
    const gifsHost = fakeHost({ json: giphyPage([]) });
    const stickersHost = fakeHost({ json: giphyPage([]) });

    await fetchGifs(gifsHost, SETTINGS, 'giphy-gifs', 'кот', null, locale);
    await fetchGifs(stickersHost, SETTINGS, 'giphy-stickers', 'кот', null, locale);

    expect(requestParams(gifsHost).get('lang')).toBe(lang);
    expect(requestParams(stickersHost).get('lang')).toBe(lang);
  });

  it('тренды GIPHY уходят без lang: у trending параметра языка нет', async () => {
    const host = fakeHost({ json: giphyPage([]) });

    await fetchGifs(host, SETTINGS, 'giphy-gifs', '', null, 'en');

    expect(requestParams(host).has('lang')).toBe(false);
  });

  it.each([
    ['ru', 'ru_RU'],
    ['en', 'en_US'],
  ] as const)(
    'поиск и тренды KLIPY при языке %s уходят с locale=%s',
    async (locale, klipyLocale) => {
      const searchHost = fakeHost({ json: { results: [] } });
      const featuredHost = fakeHost({ json: { results: [] } });

      await fetchGifs(searchHost, SETTINGS, 'klipy', 'кот', null, locale);
      await fetchGifs(featuredHost, SETTINGS, 'klipy', '', null, locale);

      expect(requestParams(searchHost).get('locale')).toBe(klipyLocale);
      expect(requestParams(featuredHost).get('locale')).toBe(klipyLocale);
    }
  );
});

/**
 * `Host`, у которого `fetchJson` бросает: отказ API, сеть или политика хостов.
 *
 * @param error — что бросает запрос
 * @returns фейковое окружение
 */
const failingHost = (error: unknown) => {
  return fakeHost({
    onJson: () => {
      throw error;
    },
  });
};

describe('checkGifKey', () => {
  it('GIPHY: один запрос трендов с limit=1 и ключом', async () => {
    const host = fakeHost({ json: giphyPage([]) });

    await expect(checkGifKey(host, 'giphy', 'g-key')).resolves.toBe('ok');

    expect(host.fetchJson).toHaveBeenCalledTimes(1);
    const url = new URL(vi.mocked(host.fetchJson).mock.calls[0]?.[0] || '');

    expect(`${url.origin}${url.pathname}`).toBe('https://api.giphy.com/v1/gifs/trending');
    expect(url.searchParams.get('api_key')).toBe('g-key');
    expect(url.searchParams.get('limit')).toBe('1');
  });

  it('KLIPY: один запрос featured с limit=1 и ключом', async () => {
    const host = fakeHost({ json: { results: [], next: '' } });

    await expect(checkGifKey(host, 'klipy', 'k-key')).resolves.toBe('ok');

    expect(host.fetchJson).toHaveBeenCalledTimes(1);
    const url = new URL(vi.mocked(host.fetchJson).mock.calls[0]?.[0] || '');

    expect(`${url.origin}${url.pathname}`).toBe('https://api.klipy.com/v2/featured');
    expect(url.searchParams.get('key')).toBe('k-key');
    expect(url.searchParams.get('limit')).toBe('1');
  });

  it('HTTP 401 и 403 — ключ не принят', async () => {
    await expect(
      checkGifKey(failingHost(httpError(401, '')), 'giphy', 'g')
    ).resolves.toBe('rejected');
    await expect(
      checkGifKey(failingHost(httpError(403, 'x')), 'klipy', 'k')
    ).resolves.toBe('rejected');
  });

  it('KLIPY: HTTP 404 — ключ не принят, так KLIPY отвечает на неверный ключ', async () => {
    const body =
      '{"result":false,"errors":{"message":["The provided API key is invalid."]}}';

    await expect(
      checkGifKey(failingHost(httpError(404, body)), 'klipy', 'k')
    ).resolves.toBe('rejected');
  });

  it('GIPHY: HTTP 404 — не удалось проверить, неверный ключ GIPHY отклоняет 401', async () => {
    await expect(
      checkGifKey(failingHost(httpError(404, '')), 'giphy', 'g')
    ).resolves.toBe('unavailable');
  });

  it('статус разбирается из текста: ошибка с границы SW — не экземпляр от httpError', async () => {
    const host = failingHost(new Error(httpError(401, 'Unauthorized').message));

    await expect(checkGifKey(host, 'klipy', 'k')).resolves.toBe('rejected');
  });

  it('HTTP 500 — не удалось проверить', async () => {
    await expect(
      checkGifKey(failingHost(httpError(500, '')), 'giphy', 'g')
    ).resolves.toBe('unavailable');
  });

  it('сетевая ошибка — не удалось проверить', async () => {
    await expect(
      checkGifKey(failingHost(new TypeError('Failed to fetch')), 'klipy', 'k')
    ).resolves.toBe('unavailable');
  });

  it('битый ответ — не удалось проверить', async () => {
    await expect(
      checkGifKey(fakeHost({ json: { data: 'x' } }), 'giphy', 'g')
    ).resolves.toBe('unavailable');
    await expect(checkGifKey(fakeHost({ json: null }), 'klipy', 'k')).resolves.toBe(
      'unavailable'
    );
  });
});
