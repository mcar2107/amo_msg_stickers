import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deletePack, getPack, putPack, putSticker } from '../src/core/db';
import type { Pack } from '../src/core/db.types';
import { setLocale } from '../src/core/i18n/translate';
import { httpError, tooBigError } from '../src/core/net';
import { importTelegramSet, isBotTokenFormat } from '../src/core/sources/telegram';

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
    deletePack: vi.fn(async () => {}),
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

beforeEach(() => {
  vi.clearAllMocks();
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

    await importTelegramSet(host, TOKEN, 'Pack', onProgress);

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

      await expect(importTelegramSet(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
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

    await importTelegramSet(host, TOKEN, 'Pack', onProgress);

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

    await expect(importTelegramSet(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
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

      await expect(importTelegramSet(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
        message
      );
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

      await expect(importTelegramSet(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
        message
      );
      expect(deletePack).toHaveBeenCalledWith('tg:Pack');
    }
  );

  it.each([
    ['ru', 'Telegram: метод getStickerSet не выполнен'],
    ['en', 'Telegram: getStickerSet failed'],
  ] as const)('отказ Bot API без описания — текст на %s', async (locale, message) => {
    setLocale(locale);
    const host = fakeHost({ json: { ok: false } });

    await expect(importTelegramSet(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
      message
    );
  });

  it('отказ Bot API с описанием — описание Telegram как есть', async () => {
    const host = fakeHost({
      json: { ok: false, description: 'Bad Request: STICKERSET_INVALID' },
    });

    await expect(importTelegramSet(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
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

    await expect(importTelegramSet(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
      BAD_RESPONSE
    );
    expect(deletePack).not.toHaveBeenCalled();
    expect(putPack).toHaveBeenLastCalledWith(previous);
  });

  it('ответ не в формате Bot API — ошибка', async () => {
    const host = fakeHost({ json: '<html>' });

    await expect(importTelegramSet(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
      BAD_RESPONSE
    );
  });

  it('в английском интерфейсе непонятая ссылка — английский текст', async () => {
    setLocale('en');

    await expect(
      importTelegramSet(fakeHost({}), TOKEN, 'не ссылка', vi.fn())
    ).rejects.toThrow("Couldn't parse the link. Expected t.me/addstickers/Name");
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

    await importTelegramSet(host, '', 'Pack', vi.fn());

    expect(putSticker).toHaveBeenCalledTimes(1);
    expect(requestTokens(host)).toEqual([BUILTIN, BUILTIN, BUILTIN]);
  });

  it('свой токен важнее встроенного', async () => {
    builtin.token = BUILTIN;
    const host = fakeHost({ onJson: botApi(PACK) });

    await importTelegramSet(host, TOKEN, 'Pack', vi.fn());

    expect(requestTokens(host)).toEqual([TOKEN, TOKEN, TOKEN]);
  });

  it('без своего и встроенного — noToken без запросов', async () => {
    const host = fakeHost({ onJson: botApi(PACK) });

    await expect(importTelegramSet(host, '', 'Pack', vi.fn())).rejects.toThrow(
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

    await expect(importTelegramSet(host, '', 'Pack', vi.fn())).rejects.toThrow(
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

    await expect(importTelegramSet(host, '', 'Pack', vi.fn())).rejects.toThrow(
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

    await expect(importTelegramSet(host, TOKEN, 'Pack', vi.fn())).rejects.toThrow(
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

    await expect(importTelegramSet(host, '', 'Pack', vi.fn())).rejects.toThrow(
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

    await expect(importTelegramSet(host, '', 'Pack', vi.fn())).rejects.toThrow(
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

    await expect(importTelegramSet(host, '', 'Pack', vi.fn())).rejects.toThrow(
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

    await expect(importTelegramSet(host, '', 'Pack', vi.fn())).rejects.toThrow(
      BUILTIN_UNAVAILABLE
    );
    expect(deletePack).toHaveBeenCalledWith('tg:Pack');
  });

  it('401 на скачивании файла встроенного — ошибка недоступности', async () => {
    builtin.token = BUILTIN;
    const host = fakeHost({ onJson: botApi(PACK) });

    vi.mocked(host.fetchBlob).mockRejectedValue(httpError(401, 'Unauthorized'));

    await expect(importTelegramSet(host, '', 'Pack', vi.fn())).rejects.toThrow(
      BUILTIN_UNAVAILABLE
    );
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
