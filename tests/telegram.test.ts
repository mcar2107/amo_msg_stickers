import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toStickerGif } from '../src/core/convert';
import {
  deletePack,
  deleteSticker,
  getPack,
  listStickers,
  putPack,
  putSticker,
  setPackCover,
} from '../src/core/db';
import type { Pack, StickerRec } from '../src/core/db.types';
import type { Host } from '../src/core/host.types';
import { setLocale } from '../src/core/i18n/translate';
import { httpError, tooBigError } from '../src/core/net';
import {
  importTelegramSet,
  isBotTokenFormat,
  previewOutcome,
  resolveTelegramSet,
} from '../src/core/sources/telegram';
import type { ImportProgress } from '../src/core/sources/telegram.types';

import { fakeHost } from './helpers/fakeHost';

/**
 * Конвертации нужен canvas, а базе — IndexedDB: в Node их нет, и проверяем мы здесь
 * обращение к Bot API, а не их.
 */
vi.mock('../src/core/convert', () => {
  return {
    toStickerGif: vi.fn(async () => {
      return { blob: new Blob(['gif']), width: 512, height: 512 };
    }),
  };
});

/**
 * Токен сборки подменяется по тесту: без подмены `vitest.config.ts` даёт сборку без него.
 */
const builtin = vi.hoisted(() => {
  return { token: '' };
});

vi.mock('../src/core/builtinToken', () => {
  return {
    get BUILTIN_TELEGRAM_TOKEN() {
      return builtin.token;
    },
  };
});

vi.mock('../src/core/db', () => {
  return {
    getPack: vi.fn(async () => {}),
    putPack: vi.fn(async () => {}),
    putSticker: vi.fn(async () => {}),
    setPackCover: vi.fn(async () => {}),
    deletePack: vi.fn(async () => {}),
    deleteSticker: vi.fn(async () => {}),
    listStickers: vi.fn(async () => {
      return [];
    }),
  };
});

const TOKEN = '123456:secret';
const FILE_API = `https://api.telegram.org/file/bot${TOKEN}/`;

const NO_STICKERS = 'Telegram: в паке нет пригодных стикеров';
const BAD_RESPONSE = 'Telegram: неожиданный ответ';
const BAD_FILE_PATH = 'Telegram: недопустимый путь файла';

const sticker = (id: string) => {
  return { file_id: `f-${id}`, file_unique_id: id, is_animated: false, is_video: false };
};

/**
 * Bot API по методам: `getStickerSet` отдаёт `set`, `getFile` — путь из `paths` по
 * `file_id`.
 *
 * @param set — результат `getStickerSet`
 * @param paths — `file_path` по `file_id`
 * @returns ответ на запрос по адресу
 */
const botApi = (set: unknown, paths: Record<string, string> = {}) => {
  return (url: string) => {
    const { pathname, searchParams } = new URL(url);

    if (pathname.endsWith('/getStickerSet')) return { ok: true, result: set };
    const fileId = searchParams.get('file_id') || '';
    const filePath = fileId in paths ? paths[fileId] : `stickers/${fileId}.webp`;

    return { ok: true, result: { file_path: filePath } };
  };
};

/**
 * Импорт по ссылке, как его ведёт провайдер: набор, затем импорт по нему.
 *
 * @param host — окружение
 * @param ownToken — свой токен
 * @param input — ссылка или имя пака
 * @param onProgress — прогресс по стикерам
 * @returns импортированный пак
 */
const importByLink = async (
  host: Host,
  ownToken: string,
  input: string,
  onProgress: (progress: ImportProgress) => void
) => {
  const set = await resolveTelegramSet(host, ownToken, input);

  return importTelegramSet(host, ownToken, set, onProgress);
};

/**
 * Методы Bot API по порядку запросов `fetchJson`.
 *
 * @param host — окружение после запросов
 * @returns имя метода каждого запроса
 */
const botMethods = (host: Host) => {
  return vi.mocked(host.fetchJson).mock.calls.map(([url]) => {
    return new URL(url).pathname.split('/').at(-1);
  });
};

/**
 * Сброс, а не очистка: тест, который подменяет реализацию мока `db` на весь импорт
 * (`mockImplementation`), иначе оставил бы её следующим тестам.
 */
beforeEach(() => {
  vi.resetAllMocks();
  builtin.token = '';
});

afterEach(() => {
  setLocale('ru');
});

describe('importTelegramSet', () => {
  it('не запрашивает файл с `..` в пути и продолжает импорт', async () => {
    const host = fakeHost({
      onJson: botApi(
        { name: 'Pack', title: 'Пак', stickers: [sticker('a'), sticker('b')] },
        { 'f-a': `../../bot${TOKEN}/sendMessage` }
      ),
    });
    const onProgress = vi.fn();

    await importByLink(host, TOKEN, 'Pack', onProgress);

    expect(host.fetchBlob).toHaveBeenCalledTimes(1);
    expect(host.fetchBlob).toHaveBeenCalledWith(
      `${FILE_API}stickers/f-b.webp`,
      5 * 1024 * 1024
    );
    expect(putSticker).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenLastCalledWith({ done: 2, total: 2, title: 'Пак' });
  });

  it.each(['stickers/../../getMe', '/etc/passwd', 'a?x=1', 'a#b', 'a%2e%2e/b', ''])(
    'не запрашивает файл по пути %j',
    async (path) => {
      const host = fakeHost({
        onJson: botApi(
          { name: 'Pack', title: 'Пак', stickers: [sticker('a')] },
          { 'f-a': path }
        ),
      });

      await expect(importByLink(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
        BAD_FILE_PATH
      );
      expect(host.fetchBlob).not.toHaveBeenCalled();
    }
  );

  it('пропускает битый стикер, прогресс доходит до N/N', async () => {
    const broken = { file_id: 'f-x', is_animated: false, is_video: false };
    const host = fakeHost({
      onJson: botApi({
        name: 'Pack',
        title: 'Пак',
        stickers: [sticker('a'), broken, sticker('c')],
      }),
    });
    const onProgress = vi.fn();

    await importByLink(host, TOKEN, 'Pack', onProgress);

    expect(putSticker).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith({ done: 3, total: 3, title: 'Пак' });
  });

  it.each([
    { name: 'Pack', title: 'Пак' },
    { name: '../evil', title: 'Пак', stickers: [] },
    { title: 'Пак', stickers: [] },
    null,
  ])('битый getStickerSet %j — ошибка, пак не создан', async (set) => {
    const host = fakeHost({ onJson: botApi(set) });

    await expect(importByLink(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
      BAD_RESPONSE
    );
    expect(putPack).not.toHaveBeenCalled();
  });

  it.each([
    { stickers: [{}], message: BAD_RESPONSE },
    { stickers: [], message: NO_STICKERS },
  ])(
    'пак без пригодных стикеров $stickers — ошибка «$message», новый пак удалён',
    async ({ stickers, message }) => {
      const host = fakeHost({ onJson: botApi({ name: 'Pack', title: 'Пак', stickers }) });

      await expect(importByLink(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(message);
      expect(deletePack).toHaveBeenCalledWith('tg:Pack');
    }
  );

  it.each([
    ['ru', 'Файл больше 5 МБ'],
    ['en', 'File is larger than 5 MB'],
  ] as const)(
    'ни один стикер не импортирован — причина первого отказа на %s',
    async (locale, message) => {
      setLocale(locale);
      const host = fakeHost({
        onJson: botApi({
          name: 'Pack',
          title: 'Пак',
          stickers: [sticker('a'), { file_id: 'f-x' }],
        }),
      });

      vi.mocked(host.fetchBlob).mockImplementation(async (_url, maxBytes) => {
        throw tooBigError(maxBytes);
      });

      await expect(importByLink(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(message);
      expect(deletePack).toHaveBeenCalledWith('tg:Pack');
    }
  );

  it.each([
    ['ru', 'Telegram: метод getStickerSet не выполнен'],
    ['en', 'Telegram: getStickerSet failed'],
  ] as const)('отказ Bot API без описания — текст на %s', async (locale, message) => {
    setLocale(locale);
    const host = fakeHost({ json: { ok: false } });

    await expect(importByLink(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(message);
  });

  it('отказ Bot API с описанием — описание Telegram как есть', async () => {
    const host = fakeHost({
      json: { ok: false, description: 'Bad Request: STICKERSET_INVALID' },
    });

    await expect(importByLink(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
      'Bad Request: STICKERSET_INVALID'
    );
  });

  it('неудачный повтор импорта не удаляет ранее импортированный пак', async () => {
    const previous: Pack = {
      id: 'tg:Pack',
      title: 'Пак',
      source: 'telegram',
      createdAt: 1,
    };

    vi.mocked(getPack).mockResolvedValueOnce(previous);
    const host = fakeHost({
      onJson: botApi({ name: 'Pack', title: 'Пак', stickers: [{}] }),
    });

    await expect(importByLink(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
      BAD_RESPONSE
    );
    expect(deletePack).not.toHaveBeenCalled();
    expect(putPack).toHaveBeenLastCalledWith(previous);
  });

  it('ответ не в формате Bot API — ошибка', async () => {
    const host = fakeHost({ json: '<html>' });

    await expect(importByLink(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
      BAD_RESPONSE
    );
  });

  it('в английском интерфейсе непонятая ссылка — английский текст', async () => {
    setLocale('en');

    await expect(importByLink(fakeHost({}), TOKEN, 'не ссылка', vi.fn())).rejects.toThrow(
      "Couldn't parse the link. Expected t.me/addstickers/Name"
    );
  });
});

describe('importTelegramSet: место пака в порядке', () => {
  const STARTED_AT = 5000;
  const SET = { name: 'Pack', title: 'Пак', stickers: [sticker('a'), sticker('b')] };

  /**
   * Подменяется только `Date`: таймеры остаются настоящими, и асинхронный импорт идёт как обычно.
   */
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(STARTED_AT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Записи пака из всех вызовов `putPack`.
   *
   * @returns записанные паки по порядку
   */
  const writtenPacks = () => {
    return vi.mocked(putPack).mock.calls.map(([pack]) => {
      return pack;
    });
  };

  /**
   * `createdAt` записанных стикеров по порядку.
   *
   * @returns время добавления каждого стикера
   */
  const stickerTimes = () => {
    return vi.mocked(putSticker).mock.calls.map(([{ createdAt }]) => {
      return createdAt;
    });
  };

  it('новый пак пишется с usedAt — временем импорта', async () => {
    await importTelegramSet(fakeHost({ onJson: botApi(SET) }), TOKEN, SET, vi.fn());

    expect(writtenPacks().length).toBeGreaterThan(0);

    for (const pack of writtenPacks()) {
      expect(pack).toMatchObject({ createdAt: STARTED_AT, usedAt: STARTED_AT });
    }
  });

  it('повторный импорт сохраняет createdAt и usedAt прежней записи', async () => {
    const previous: Pack = {
      id: 'tg:Pack',
      title: 'Пак',
      source: 'telegram',
      createdAt: 1,
      usedAt: 300,
    };

    vi.mocked(getPack).mockResolvedValueOnce(previous);
    await importTelegramSet(fakeHost({ onJson: botApi(SET) }), TOKEN, SET, vi.fn());

    expect(writtenPacks().length).toBeGreaterThan(0);

    for (const pack of writtenPacks()) {
      expect(pack).toMatchObject({ createdAt: 1, usedAt: 300 });
    }
  });

  it('повторный импорт неиспользованного пака не даёт ему usedAt', async () => {
    const previous: Pack = {
      id: 'tg:Pack',
      title: 'Пак',
      source: 'telegram',
      createdAt: 1,
    };

    vi.mocked(getPack).mockResolvedValueOnce(previous);
    await importTelegramSet(fakeHost({ onJson: botApi(SET) }), TOKEN, SET, vi.fn());

    expect(writtenPacks().length).toBeGreaterThan(0);

    for (const pack of writtenPacks()) {
      expect(pack.createdAt).toBe(1);
      expect(pack).not.toHaveProperty('usedAt');
    }
  });

  it('createdAt стикеров — от начала импорта плюс индекс, и у повторного импорта', async () => {
    vi.mocked(getPack).mockResolvedValueOnce({
      id: 'tg:Pack',
      title: 'Пак',
      source: 'telegram',
      createdAt: 1,
      usedAt: 300,
    });
    await importTelegramSet(fakeHost({ onJson: botApi(SET) }), TOKEN, SET, vi.fn());

    expect(stickerTimes()).toEqual([STARTED_AT, STARTED_AT + 1]);
  });

  it('обложка пишется отдельно от записи пака: отметка во время импорта не затирается', async () => {
    vi.mocked(getPack).mockResolvedValueOnce({
      id: 'tg:Pack',
      title: 'Пак',
      source: 'telegram',
      createdAt: 1,
      usedAt: 300,
    });
    await importTelegramSet(fakeHost({ onJson: botApi(SET) }), TOKEN, SET, vi.fn());

    expect(writtenPacks()).toHaveLength(1);
    expect(setPackCover).toHaveBeenCalledOnce();
    expect(setPackCover).toHaveBeenCalledWith(
      'tg:Pack',
      vi.mocked(putSticker).mock.calls[0]?.[0].id
    );
  });
});

describe('importTelegramSet: свой и встроенный токен', () => {
  const BUILTIN = '999:builtin';
  const OWN_UNAUTHORIZED = '{"ok":false,"error_code":401,"description":"Unauthorized"}';
  const BUILTIN_UNAVAILABLE = 'Встроенный бот Telegram недоступен';
  const PACK = { name: 'Pack', title: 'Пак', stickers: [sticker('a')] };

  /**
   * Токены всех запросов импорта — из адресов `fetchJson` и `fetchBlob`.
   *
   * @param host — окружение после импорта
   * @returns токен каждого запроса по порядку
   */
  const requestTokens = (host: ReturnType<typeof fakeHost>) => {
    const urls = [
      ...vi.mocked(host.fetchJson).mock.calls,
      ...vi.mocked(host.fetchBlob).mock.calls,
    ];

    return urls.map(([url]) => {
      return /\/bot([^/]+)\//.exec(url)?.[1];
    });
  };

  it('без своего токена импорт идёт со встроенным', async () => {
    builtin.token = BUILTIN;
    const host = fakeHost({ onJson: botApi(PACK) });

    await importByLink(host, '', 'Pack', vi.fn());

    expect(putSticker).toHaveBeenCalledTimes(1);
    expect(requestTokens(host)).toEqual([BUILTIN, BUILTIN, BUILTIN]);
  });

  it('свой токен важнее встроенного', async () => {
    builtin.token = BUILTIN;
    const host = fakeHost({ onJson: botApi(PACK) });

    await importByLink(host, TOKEN, 'Pack', vi.fn());

    expect(requestTokens(host)).toEqual([TOKEN, TOKEN, TOKEN]);
  });

  it('без своего и встроенного — noToken без запросов', async () => {
    const host = fakeHost({ onJson: botApi(PACK) });

    await expect(importByLink(host, '', 'Pack', vi.fn())).rejects.toThrow(
      'Укажите токен бота в настройках'
    );
    expect(host.fetchJson).not.toHaveBeenCalled();
    expect(host.fetchBlob).not.toHaveBeenCalled();
  });

  it.each([401, 429])('%i на встроенном — ошибка недоступности', async (status) => {
    builtin.token = BUILTIN;
    const host = fakeHost({
      onJson: () => {
        throw httpError(status, OWN_UNAUTHORIZED);
      },
    });

    await expect(importByLink(host, '', 'Pack', vi.fn())).rejects.toThrow(
      BUILTIN_UNAVAILABLE
    );
  });

  it('недоступность встроенного на английском', async () => {
    setLocale('en');
    builtin.token = BUILTIN;
    const host = fakeHost({
      onJson: () => {
        throw httpError(401, OWN_UNAUTHORIZED);
      },
    });

    await expect(importByLink(host, '', 'Pack', vi.fn())).rejects.toThrow(
      'built-in Telegram bot'
    );
  });

  it('401 на своём токене — текст ответа', async () => {
    builtin.token = BUILTIN;
    const host = fakeHost({
      onJson: () => {
        throw httpError(401, OWN_UNAUTHORIZED);
      },
    });

    await expect(importByLink(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
      httpError(401, OWN_UNAUTHORIZED)
    );
  });

  it('400 на встроенном — текст ответа', async () => {
    builtin.token = BUILTIN;
    const body =
      '{"ok":false,"error_code":400,"description":"Bad Request: STICKERSET_INVALID"}';
    const host = fakeHost({
      onJson: () => {
        throw httpError(400, body);
      },
    });

    await expect(importByLink(host, '', 'Pack', vi.fn())).rejects.toThrow(
      httpError(400, body)
    );
  });

  it('отказ getFile на всех стикерах встроенного — ошибка недоступности', async () => {
    builtin.token = BUILTIN;
    const set = botApi({
      name: 'Pack',
      title: 'Пак',
      stickers: [sticker('a'), sticker('b')],
    });
    const host = fakeHost({
      onJson: (url) => {
        if (url.includes('/getFile')) throw httpError(429, 'Too Many Requests');

        return set(url);
      },
    });

    await expect(importByLink(host, '', 'Pack', vi.fn())).rejects.toThrow(
      BUILTIN_UNAVAILABLE
    );
    expect(deletePack).toHaveBeenCalledWith('tg:Pack');
    expect(
      vi.mocked(host.fetchJson).mock.calls.filter(([url]) => {
        return url.includes('/getFile');
      })
    ).toHaveLength(1);
  });

  it('отказ встроенного посреди пака — импортированное остаётся, остальное не запрашивается', async () => {
    builtin.token = BUILTIN;
    const set = botApi({
      name: 'Pack',
      title: 'Пак',
      stickers: [sticker('a'), sticker('b'), sticker('c')],
    });
    let getFileCalls = 0;
    const host = fakeHost({
      onJson: (url) => {
        if (url.includes('/getFile')) {
          getFileCalls++;

          if (getFileCalls > 1) throw httpError(429, 'Too Many Requests');
        }

        return set(url);
      },
    });

    await expect(importByLink(host, '', 'Pack', vi.fn())).rejects.toThrow(
      BUILTIN_UNAVAILABLE
    );
    expect(getFileCalls).toBe(2);
    expect(putSticker).toHaveBeenCalledTimes(1);
    expect(deletePack).not.toHaveBeenCalled();
  });

  it('отказ встроенного после другой ошибки стикера — в статусе недоступность бота', async () => {
    builtin.token = BUILTIN;
    const set = botApi({
      name: 'Pack',
      title: 'Пак',
      stickers: [sticker('a'), sticker('b')],
    });
    let getFileCalls = 0;
    const host = fakeHost({
      onJson: (url) => {
        if (url.includes('/getFile')) {
          getFileCalls++;

          if (getFileCalls > 1) throw httpError(429, 'Too Many Requests');
        }

        return set(url);
      },
    });

    vi.mocked(host.fetchBlob).mockRejectedValue(tooBigError(5 * 1024 * 1024));

    await expect(importByLink(host, '', 'Pack', vi.fn())).rejects.toThrow(
      BUILTIN_UNAVAILABLE
    );
    expect(deletePack).toHaveBeenCalledWith('tg:Pack');
  });

  it('401 на скачивании файла встроенного — ошибка недоступности', async () => {
    builtin.token = BUILTIN;
    const host = fakeHost({ onJson: botApi(PACK) });

    vi.mocked(host.fetchBlob).mockRejectedValue(httpError(401, 'Unauthorized'));

    await expect(importByLink(host, '', 'Pack', vi.fn())).rejects.toThrow(
      BUILTIN_UNAVAILABLE
    );
  });
});

describe('resolveTelegramSet и importTelegramSet по набору', () => {
  const SET = { name: 'Pack', title: 'Пак', stickers: [sticker('a'), sticker('b')] };

  it('resolve отдаёт набор одним getStickerSet и ничего не пишет в базу', async () => {
    const host = fakeHost({ onJson: botApi(SET) });

    await expect(
      resolveTelegramSet(host, TOKEN, 'https://t.me/addstickers/Pack')
    ).resolves.toEqual(SET);
    expect(botMethods(host)).toEqual(['getStickerSet']);
    expect(putPack).not.toHaveBeenCalled();
  });

  it('импорт по набору не запрашивает getStickerSet', async () => {
    const host = fakeHost({ onJson: botApi(SET) });

    await importTelegramSet(host, TOKEN, SET, vi.fn());

    expect(botMethods(host)).toEqual(['getFile', 'getFile']);
    expect(putSticker).toHaveBeenCalledTimes(2);
  });

  it('resolve: битая ссылка — ошибка без запроса', async () => {
    const host = fakeHost({ onJson: botApi(SET) });

    await expect(resolveTelegramSet(host, TOKEN, 'не ссылка')).rejects.toThrow(
      'Не понял ссылку'
    );
    expect(host.fetchJson).not.toHaveBeenCalled();
  });

  it('resolve: без своего и встроенного токена — noToken без запроса', async () => {
    const host = fakeHost({ onJson: botApi(SET) });

    await expect(resolveTelegramSet(host, '', 'Pack')).rejects.toThrow(
      'Укажите токен бота в настройках'
    );
    expect(host.fetchJson).not.toHaveBeenCalled();
  });

  it('resolve: без своего токена — встроенный, свой важнее', async () => {
    builtin.token = '999:builtin';
    const host = fakeHost({ onJson: botApi(SET) });

    await resolveTelegramSet(host, '', 'Pack');
    await resolveTelegramSet(host, TOKEN, 'Pack');

    const tokens = vi.mocked(host.fetchJson).mock.calls.map(([url]) => {
      return /\/bot([^/]+)\//.exec(url)?.[1];
    });

    expect(tokens).toEqual(['999:builtin', TOKEN]);
  });

  it.each([401, 429])(
    'resolve: %i на встроенном — недоступность бота',
    async (status) => {
      builtin.token = '999:builtin';
      const host = fakeHost({
        onJson: () => {
          throw httpError(status, 'Unauthorized');
        },
      });

      await expect(resolveTelegramSet(host, '', 'Pack')).rejects.toThrow(
        'Встроенный бот Telegram недоступен'
      );
    }
  );

  it('resolve: битый набор — ошибка ответа', async () => {
    const host = fakeHost({
      onJson: botApi({ name: '../evil', title: 'Пак', stickers: [] }),
    });

    await expect(resolveTelegramSet(host, TOKEN, 'Pack')).rejects.toThrow(BAD_RESPONSE);
  });
});

describe('previewOutcome', () => {
  /**
   * Ошибка, которую бросает `resolveTelegramSet` на ответ Bot API.
   *
   * @param json — ответ `getStickerSet`
   * @param ownToken — свой токен; пустой — встроенный
   * @returns пойманная ошибка
   */
  const resolveError = async (json: () => unknown, ownToken = TOKEN) => {
    try {
      await resolveTelegramSet(fakeHost({ onJson: json }), ownToken, 'Pack');
    } catch (error) {
      return error;
    }

    throw new Error('resolve не отказал');
  };

  it('HTTP 400 — пак не найден', async () => {
    const error = await resolveError(() => {
      throw httpError(
        400,
        '{"ok":false,"description":"Bad Request: STICKERSET_INVALID"}'
      );
    });

    expect(previewOutcome(error)).toBe('notFound');
  });

  it('HTTP 400 на встроенном — пак не найден', async () => {
    builtin.token = '999:builtin';
    const error = await resolveError(() => {
      throw httpError(400, 'Bad Request');
    }, '');

    expect(previewOutcome(error)).toBe('notFound');
  });

  it('ответ ok: false — пак не найден', async () => {
    const error = await resolveError(() => {
      return { ok: false, description: 'Bad Request: STICKERSET_INVALID' };
    });

    expect(previewOutcome(error)).toBe('notFound');
  });

  it.each([401, 429])('%i на встроенном — без превью', async (status) => {
    builtin.token = '999:builtin';
    const error = await resolveError(() => {
      throw httpError(status, 'Too Many Requests');
    }, '');

    expect(previewOutcome(error)).toBe('noPreview');
  });

  it.each([401, 429])('%i на своём — без превью', async (status) => {
    const error = await resolveError(() => {
      throw httpError(status, 'Unauthorized');
    });

    expect(previewOutcome(error)).toBe('noPreview');
  });

  it('сеть — без превью', async () => {
    const error = await resolveError(() => {
      throw new TypeError('Failed to fetch');
    });

    expect(previewOutcome(error)).toBe('noPreview');
  });

  it.each([{ html: true }, { ok: true, result: null }])(
    'битый ответ %j — без превью',
    async (json) => {
      const error = await resolveError(() => {
        return json;
      });

      expect(previewOutcome(error)).toBe('noPreview');
    }
  );

  it('не ошибка — без превью', () => {
    expect(previewOutcome('HTTP 400 x')).toBe('noPreview');
  });
});

describe('importTelegramSet: отмена', () => {
  const PREVIOUS: Pack = {
    id: 'tg:Pack',
    title: 'Пак',
    source: 'telegram',
    createdAt: 1,
  };

  /**
   * Набор из стикеров с данными id.
   *
   * @param ids — `file_unique_id` стикеров по порядку
   * @returns набор пака
   */
  const setOf = (ids: string[]) => {
    return { name: 'Pack', title: 'Пак', stickers: ids.map(sticker) };
  };

  /**
   * Записи стикеров пака в базе.
   *
   * @param ids — `file_unique_id` стикеров
   * @returns записи стикеров
   */
  const records = (ids: string[]) => {
    return ids.map((id): StickerRec => {
      return {
        id: `tg:${id}`,
        packId: 'tg:Pack',
        blob: new Blob(),
        width: 512,
        height: 512,
        createdAt: 1,
      };
    });
  };

  /**
   * id удалённых по одному стикеров.
   *
   * @returns id из вызовов `deleteSticker`
   */
  const deletedStickers = () => {
    return vi.mocked(deleteSticker).mock.calls.map(([id]) => {
      return id;
    });
  };

  it('отмена нового пака после 2 стикеров — пак удалён, дальше запросов нет', async () => {
    const controller = new AbortController();
    const set = setOf(['a', 'b', 'c', 'd', 'e']);
    const host = fakeHost({ onJson: botApi(set) });
    const onProgress = vi.fn(({ done }: ImportProgress) => {
      if (done === 2) controller.abort();
    });

    await expect(
      importTelegramSet(host, TOKEN, set, onProgress, controller.signal)
    ).rejects.toHaveProperty('name', 'AbortError');

    expect(deletePack).toHaveBeenCalledWith('tg:Pack');
    expect(putSticker).toHaveBeenCalledTimes(2);
    expect(botMethods(host)).toEqual(['getFile', 'getFile']);
    expect(host.fetchBlob).toHaveBeenCalledTimes(2);
  });

  it('отмена повторного импорта — прежняя запись, новые стикеры удалены, старые на месте', async () => {
    const controller = new AbortController();
    const set = setOf(['a', 'b', 'c', 'd', 'e']);
    const host = fakeHost({ onJson: botApi(set) });

    vi.mocked(getPack).mockResolvedValueOnce(PREVIOUS);
    vi.mocked(listStickers)
      .mockResolvedValueOnce(records(['a', 'b']))
      .mockResolvedValueOnce(records(['a', 'b', 'c', 'd']));

    await expect(
      importTelegramSet(
        host,
        TOKEN,
        set,
        ({ done }) => {
          if (done === 4) controller.abort();
        },
        controller.signal
      )
    ).rejects.toHaveProperty('name', 'AbortError');

    expect(deletePack).not.toHaveBeenCalled();
    expect(putPack).toHaveBeenLastCalledWith(PREVIOUS);
    expect(deletedStickers()).toEqual(['tg:c', 'tg:d']);
  });

  it('отмена повторного импорта возвращает перезаписанный стикер к прежней записи', async () => {
    const controller = new AbortController();
    const set = setOf(['a', 'b', 'c']);
    const host = fakeHost({ onJson: botApi(set) });
    const before = records(['a', 'b']);
    const [first, second] = before;
    const overwritten = records(['a', 'b', 'c']).map((record) => {
      return { ...record, createdAt: 1000 };
    });

    vi.mocked(getPack).mockResolvedValueOnce(PREVIOUS);
    vi.mocked(listStickers)
      .mockResolvedValueOnce(before)
      .mockResolvedValueOnce(overwritten);

    await expect(
      importTelegramSet(
        host,
        TOKEN,
        set,
        ({ done }) => {
          if (done === 3) controller.abort();
        },
        controller.signal
      )
    ).rejects.toHaveProperty('name', 'AbortError');

    expect(vi.mocked(putSticker).mock.calls.slice(-2)).toEqual([[first], [second]]);
    expect(deletedStickers()).toEqual(['tg:c']);
  });

  it('отмена во время getFile — ответ отброшен, fetchBlob и новых запросов нет', async () => {
    const controller = new AbortController();
    const set = setOf(['a', 'b', 'c']);
    const api = botApi(set);
    let getFileCalls = 0;
    const host = fakeHost({
      onJson: (url) => {
        getFileCalls++;

        if (getFileCalls === 2) controller.abort();

        return api(url);
      },
    });

    await expect(
      importTelegramSet(host, TOKEN, set, vi.fn(), controller.signal)
    ).rejects.toHaveProperty('name', 'AbortError');

    expect(getFileCalls).toBe(2);
    expect(host.fetchBlob).toHaveBeenCalledTimes(1);
    expect(putSticker).toHaveBeenCalledTimes(1);
    expect(deletePack).toHaveBeenCalledWith('tg:Pack');
  });

  it('отмена сразу после записи последнего стикера удаляет и его — по снимку, а не по счётчику', async () => {
    const controller = new AbortController();
    const set = setOf(['a', 'b', 'c']);
    const host = fakeHost({ onJson: botApi(set) });

    vi.mocked(getPack).mockResolvedValueOnce(PREVIOUS);
    vi.mocked(listStickers)
      .mockResolvedValueOnce(records(['a', 'b']))
      .mockResolvedValueOnce(records(['a', 'b', 'c']));
    vi.mocked(putSticker).mockImplementation(async ({ id }) => {
      if (id === 'tg:c') controller.abort();
    });

    await expect(
      importTelegramSet(host, TOKEN, set, vi.fn(), controller.signal)
    ).rejects.toHaveProperty('name', 'AbortError');

    expect(putPack).toHaveBeenLastCalledWith(PREVIOUS);
    expect(deletedStickers()).toEqual(['tg:c']);
  });

  it('отмена до старта — ни записи, ни запросов', async () => {
    const controller = new AbortController();
    const set = setOf(['a']);
    const host = fakeHost({ onJson: botApi(set) });

    controller.abort();

    await expect(
      importTelegramSet(host, TOKEN, set, vi.fn(), controller.signal)
    ).rejects.toHaveProperty('name', 'AbortError');

    expect(putPack).not.toHaveBeenCalled();
    expect(host.fetchJson).not.toHaveBeenCalled();
  });

  it('конвертация получает signal импорта', async () => {
    const controller = new AbortController();
    const set = setOf(['a']);

    await importTelegramSet(
      fakeHost({ onJson: botApi(set) }),
      TOKEN,
      set,
      vi.fn(),
      controller.signal
    );

    expect(vi.mocked(toStickerGif).mock.calls[0]?.[2]).toEqual({
      signal: controller.signal,
    });
  });
});

describe('isBotTokenFormat', () => {
  it('<цифры>:<строка> — токен', () => {
    expect(isBotTokenFormat('123:abc-_')).toBe(true);
    expect(isBotTokenFormat(TOKEN)).toBe(true);
  });

  it('пустая строка — не токен', () => {
    expect(isBotTokenFormat('')).toBe(false);
  });

  it('без id бота или без секрета — не токен', () => {
    expect(isBotTokenFormat('abc')).toBe(false);
    expect(isBotTokenFormat('123:')).toBe(false);
    expect(isBotTokenFormat(':abc')).toBe(false);
    expect(isBotTokenFormat('12a:abc')).toBe(false);
  });

  it('пробелы по краям снимаются, внутри — не токен', () => {
    expect(isBotTokenFormat(' 123:abc \n')).toBe(true);
    expect(isBotTokenFormat('   ')).toBe(false);
    expect(isBotTokenFormat('123:ab c')).toBe(false);
    expect(isBotTokenFormat('123 :abc')).toBe(false);
  });
});
