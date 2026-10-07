import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Pack } from '../src/core/db.types';
import { setLocale } from '../src/core/i18n/translate';
import type { ImportErrorTarget } from '../src/core/ui/Picker/PickerProvider/finishImport/finishImport.types';
import { runPackImport } from '../src/core/ui/Picker/PickerProvider/runPackImport/runPackImport';

/**
 * Разбор ссылки живёт в модуле Bot API, а он тянет конвертацию и базу: в Node нет ни canvas,
 * ни IndexedDB, а проверяем мы здесь ход импорта, а не их.
 */
vi.mock('../src/core/convert', () => {
  return { toStickerGif: vi.fn() };
});

vi.mock('../src/core/db', () => {
  return {
    getPack: vi.fn(),
    putPack: vi.fn(),
    putSticker: vi.fn(),
    deletePack: vi.fn(),
  };
});

const LINK = 'https://t.me/addstickers/cats';
const PACK: Pack = { id: 'tg:cats', title: 'Коты', source: 'telegram', createdAt: 0 };

/**
 * Колбэки хода импорта с общим журналом: порядок обновления паков и итога важен.
 *
 * @param target — куда показать ошибку в момент завершения
 * @param importSet — импорт пака по ссылке
 * @returns колбэки и журнал
 */
const run = (
  target: ImportErrorTarget,
  importSet: (link: string, signal: AbortSignal) => Promise<Pack>,
  link = LINK
) => {
  const calls: string[] = [];
  const importSetMock = vi.fn(importSet);
  const controller = new AbortController();

  return {
    calls,
    controller,
    importSet: importSetMock,
    start: () => {
      return runPackImport({
        link,
        signal: controller.signal,
        importSet: importSetMock,
        refreshPacks: async () => {
          calls.push('refresh');
        },
        errorTarget: () => {
          return target;
        },
        onStart: () => {
          calls.push('start');
        },
        onSuccess: (pack) => {
          calls.push(`success ${pack.id}`);
        },
        onError: (message, errorTarget) => {
          calls.push(`error ${errorTarget} ${message}`);
        },
        onCancel: () => {
          calls.push('cancel');
        },
        onFinish: () => {
          calls.push('finish');
        },
      });
    },
  };
};

afterEach(() => {
  setLocale('ru');
});

describe('runPackImport', () => {
  it('ссылка без имени пака — ошибка у поля без запроса и без хода импорта', async () => {
    const { calls, importSet, start } = run(
      'status',
      async () => {
        return PACK;
      },
      'hello world'
    );

    await start();

    expect(importSet).not.toHaveBeenCalled();
    expect(calls).toEqual([
      'error field Не понял ссылку. Нужна вида t.me/addstickers/Name',
    ]);
  });

  it('ссылка без имени пака на английском — английская ошибка', async () => {
    setLocale('en');

    const { calls, start } = run(
      'status',
      async () => {
        return PACK;
      },
      't.me/addstickers/'
    );

    await start();

    expect(calls).toEqual([
      "error field Couldn't parse the link. Expected t.me/addstickers/Name",
    ]);
  });

  it('успех — паки перечитаны, затем итог', async () => {
    const { calls, importSet, start } = run('field', async () => {
      return PACK;
    });

    await start();

    expect(importSet).toHaveBeenCalledWith(LINK, expect.any(AbortSignal));
    expect(calls).toEqual(['start', 'refresh', 'success tg:cats', 'finish']);
  });

  it('ошибка на открытом сегменте «Telegram» — у поля, паки перечитаны', async () => {
    const { calls, start } = run('field', async () => {
      throw new Error('Telegram: пак не найден');
    });

    await start();

    expect(calls).toEqual([
      'start',
      'refresh',
      'error field Telegram: пак не найден',
      'finish',
    ]);
  });

  it('ошибка после ухода с сегмента — в статус', async () => {
    const { calls, start } = run('status', async () => {
      throw new Error('Telegram: пак не найден');
    });

    await start();

    expect(calls).toContain('error status Telegram: пак не найден');
  });

  it('цель ошибки берётся в момент завершения, а не запуска', async () => {
    let target: ImportErrorTarget = 'field';
    const calls: string[] = [];

    await runPackImport({
      link: LINK,
      signal: new AbortController().signal,
      importSet: async () => {
        target = 'status';

        throw new Error('сбой');
      },
      refreshPacks: async () => {},
      errorTarget: () => {
        return target;
      },
      onStart: () => {},
      onSuccess: () => {},
      onError: (message, errorTarget) => {
        calls.push(`${errorTarget} ${message}`);
      },
      onCancel: () => {},
      onFinish: () => {},
    });

    expect(calls).toEqual(['status сбой']);
  });

  it('отказ не-Error — его строка', async () => {
    const { calls, start } = run('field', async () => {
      throw 'обрыв';
    });

    await start();

    expect(calls).toContain('error field обрыв');
  });

  it('отмена — паки перечитаны, исход onCancel, а не ошибка и не успех', async () => {
    const { calls, controller, importSet, start } = run(
      'field',
      async (_link, signal) => {
        controller.abort();

        throw signal.reason;
      }
    );

    await start();

    expect(importSet.mock.calls[0]?.[1]).toBe(controller.signal);
    expect(calls).toEqual(['start', 'refresh', 'cancel', 'finish']);
  });

  it('отмена с чужой ошибкой после неё — всё равно отмена', async () => {
    const { calls, controller, start } = run('status', async () => {
      controller.abort();

      throw new Error('обрыв сети');
    });

    await start();

    expect(calls).toEqual(['start', 'refresh', 'cancel', 'finish']);
  });
});
