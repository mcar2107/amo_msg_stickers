import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Pack, RecentRec } from '@core/db.types';
import { EN, setLocale, t } from '@core/i18n';
import type { FileCard, ImportPlan, LibraryFile } from '@core/libraryFile';
import { FORMAT_NAME } from '@core/libraryFile';
import type { ImportWritten } from '@core/libraryFile/importRecords';
import {
  fileImportFailure,
  fileImportStatus,
  finishFileImport,
  firstAddedSection,
  isRecentSectionShown,
} from '@ui/PickerProvider/fileImportOutcome';
import type { ImportErrorTarget } from '@ui/PickerProvider/finishImport';
import type { FileImportRun } from '@ui/PickerProvider/runFileImport';
import { runFileImport } from '@ui/PickerProvider/runFileImport';
import type { SectionMotion, SectionScrollOptions } from '@ui/usePickerView';

/**
 * Паки в порядке ленты: «Мои стикеры» первыми, затем паки Telegram по использованию.
 */
const FEED_PACKS: Pack[] = [
  { id: 'custom', title: 'Мои стикеры', source: 'custom', createdAt: 0 },
  { id: 'tg:dogs', title: 'Собаки', source: 'telegram', createdAt: 2 },
  { id: 'tg:cats', title: 'Коты', source: 'telegram', createdAt: 1 },
];

const LIBRARY_FILE: LibraryFile = {
  file: new Blob(),
  manifest: { format: FORMAT_NAME, version: 1, packs: [] },
  entries: new Map(),
};

/**
 * Карточка с заданным числом новых стикеров, избранного и недавних: ход импорта читает только их.
 *
 * @param newStickerCount — стикеров, которых нет в библиотеке
 * @param lists — сколько добавится в избранное и в недавние
 * @returns карточка
 */
const cardWith = (
  newStickerCount: number,
  lists: Partial<Pick<FileCard, 'newFavoriteCount' | 'newRecentCount'>> = {}
): FileCard => {
  return {
    packs: [],
    stickerCount: newStickerCount,
    newStickerCount,
    newPackCount: 0,
    newFavorites: [],
    newFavoriteCount: lists.newFavoriteCount || 0,
    newRecentCount: lists.newRecentCount || 0,
  };
};

const PLAN: ImportPlan = { packs: [], favorites: [], recent: [] };
const WRITTEN: ImportWritten = {
  packIds: ['tg:cats', 'custom'],
  stickerCount: 7,
  favoriteCount: 0,
  recentCount: 0,
  hasFavoriteStickers: false,
  hasRecentStickers: false,
};

afterEach(() => {
  setLocale('ru');
});

describe('firstAddedSection', () => {
  it('первый по порядку ленты, а не первый в файле', () => {
    expect(firstAddedSection(FEED_PACKS, ['tg:cats', 'custom'])).toBe('custom');
    expect(firstAddedSection(FEED_PACKS, ['tg:cats', 'tg:dogs'])).toBe('tg:dogs');
  });

  it('ничего не добавлено или пака нет в ленте — раздела нет', () => {
    expect(firstAddedSection(FEED_PACKS, [])).toBeNull();
    expect(firstAddedSection(FEED_PACKS, ['tg:gone'])).toBeNull();
  });
});

/**
 * Колбэки провайдера с общим журналом: порядок перечитывания, перехода и статуса важен.
 *
 * @param isRecentShown — покажет ли лента «Недавние» после импорта
 * @returns колбэки и журнал
 */
const viewCallbacks = (isRecentShown = true) => {
  const calls: string[] = [];

  return {
    calls,
    scrollToSection: vi.fn(
      (sectionId: string, motion: SectionMotion, options: SectionScrollOptions = {}) => {
        calls.push(
          `scroll ${sectionId} ${motion}${options.shouldFocusTab ? ' focus-tab' : ''}`
        );
      }
    ),
    showStatus: vi.fn((text: string) => {
      calls.push(`status ${text}`);
    }),
    refreshFavorites: vi.fn(async () => {
      calls.push('refresh favorites');
    }),
    refreshRecent: vi.fn(() => {
      calls.push('refresh recent');
    }),
    isRecentShown: vi.fn(async () => {
      return isRecentShown;
    }),
  };
};

describe('finishFileImport', () => {
  it('экран «Добавить стикеры» открыт — мгновенный переход к первому разделу ленты с фокусом на его вкладку, затем статус', async () => {
    const callbacks = viewCallbacks();

    await finishFileImport({
      ...callbacks,
      screen: 'add',
      packs: FEED_PACKS,
      written: WRITTEN,
    });

    expect(callbacks.calls).toEqual([
      'refresh recent',
      'refresh favorites',
      'scroll custom instant focus-tab',
      'status Добавлено стикеров: 7',
    ]);
  });

  it('другой экран или режим — избранное и недавние перечитаны, перехода нет, только статус', async () => {
    for (const screen of ['settings', null] as const) {
      const callbacks = viewCallbacks();

      await finishFileImport({
        ...callbacks,
        screen,
        packs: FEED_PACKS,
        written: { ...WRITTEN, hasFavoriteStickers: true },
      });

      expect(callbacks.scrollToSection).not.toHaveBeenCalled();
      expect(callbacks.calls).toEqual([
        'refresh recent',
        'refresh favorites',
        'status Добавлено стикеров: 7',
      ]);
    }
  });

  it('добавлены избранные стикеры — к «Избранному», даже если добавлены и недавние', async () => {
    const callbacks = viewCallbacks();

    await finishFileImport({
      ...callbacks,
      screen: 'add',
      packs: FEED_PACKS,
      written: { ...WRITTEN, hasFavoriteStickers: true, hasRecentStickers: true },
    });

    expect(callbacks.calls).toContain('scroll favorite instant focus-tab');
    expect(callbacks.isRecentShown).not.toHaveBeenCalled();
  });

  it('добавлены недавние стикеры, и раздел будет показан, — к «Недавним»', async () => {
    const callbacks = viewCallbacks(true);

    await finishFileImport({
      ...callbacks,
      screen: 'add',
      packs: FEED_PACKS,
      written: { ...WRITTEN, hasRecentStickers: true },
    });

    expect(callbacks.calls).toContain('scroll recent instant focus-tab');
  });

  it('недавние стикеры добавлены, но раздела не будет — к первому паку с добавленными стикерами', async () => {
    const callbacks = viewCallbacks(false);

    await finishFileImport({
      ...callbacks,
      screen: 'add',
      packs: FEED_PACKS,
      written: { ...WRITTEN, hasRecentStickers: true },
    });

    expect(callbacks.calls).toContain('scroll custom instant focus-tab');
  });

  it('в избранное добавлены только GIF — не к «Избранному»: стикеров нет, статус «Избранное и недавние добавлены»', async () => {
    const callbacks = viewCallbacks();

    await finishFileImport({
      ...callbacks,
      screen: 'add',
      packs: FEED_PACKS,
      written: { ...WRITTEN, packIds: [], stickerCount: 0, favoriteCount: 1 },
    });

    expect(callbacks.scrollToSection).not.toHaveBeenCalled();
    expect(callbacks.calls).toEqual([
      'refresh recent',
      'refresh favorites',
      `status ${t('status.fileImportListsDone')}`,
    ]);
  });

  it('стикеров нет, а недавние подняты — статус «Избранное и недавние добавлены»', async () => {
    const callbacks = viewCallbacks();

    await finishFileImport({
      ...callbacks,
      screen: null,
      packs: FEED_PACKS,
      written: { ...WRITTEN, packIds: [], stickerCount: 0, recentCount: 2 },
    });

    expect(callbacks.showStatus).toHaveBeenCalledWith(t('status.fileImportListsDone'));
  });

  it('сбой перечитывания избранного — не к «Избранному», которого лента может не показать; сбой — в консоль', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const callbacks = viewCallbacks();

    callbacks.refreshFavorites.mockRejectedValueOnce(new Error('db'));

    await finishFileImport({
      ...callbacks,
      screen: 'add',
      packs: FEED_PACKS,
      written: { ...WRITTEN, hasFavoriteStickers: true },
    });

    expect(callbacks.calls).toContain('scroll custom instant focus-tab');
    expect(callbacks.showStatus).toHaveBeenCalledWith('Добавлено стикеров: 7');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('ничего не записано — перехода нет, статус с нулём', async () => {
    const callbacks = viewCallbacks();

    await finishFileImport({
      ...callbacks,
      screen: 'add',
      packs: FEED_PACKS,
      written: { ...WRITTEN, packIds: [], stickerCount: 0 },
    });

    expect(callbacks.scrollToSection).not.toHaveBeenCalled();
    expect(callbacks.showStatus).toHaveBeenCalledWith('Добавлено стикеров: 0');
  });

  it('на английском — английский статус', async () => {
    setLocale('en');

    const callbacks = viewCallbacks();

    await finishFileImport({
      ...callbacks,
      screen: null,
      packs: FEED_PACKS,
      written: WRITTEN,
    });
    await finishFileImport({
      ...callbacks,
      screen: null,
      packs: FEED_PACKS,
      written: { ...WRITTEN, packIds: [], stickerCount: 0, favoriteCount: 1 },
    });

    expect(callbacks.showStatus.mock.calls).toEqual([
      ['Stickers added: 7'],
      [EN['status.fileImportListsDone']],
    ]);
  });
});

/**
 * Запись недавнего стикера.
 *
 * @param stickerId — id стикера
 * @returns запись недавних
 */
const recentSticker = (stickerId: string): RecentRec => {
  return { key: `l:${stickerId}`, ts: 1, item: { kind: 'local', stickerId } };
};

describe('isRecentSectionShown', () => {
  it('есть недавний стикер библиотеки не из избранного — раздел будет', () => {
    expect(
      isRecentSectionShown([recentSticker('a'), recentSticker('b')], ['b'], ['l:a'])
    ).toBe(true);
  });

  it('недавние — только избранные, удалённые из библиотеки или GIF — раздела не будет', () => {
    const gif: RecentRec = {
      key: 'r:giphy:1',
      ts: 1,
      item: {
        kind: 'remote',
        gif: {
          provider: 'giphy',
          id: '1',
          title: '',
          url: 'https://media.giphy.com/1.gif',
          previewUrl: 'https://media.giphy.com/1s.gif',
          width: 1,
          height: 1,
        },
      },
    };

    expect(
      isRecentSectionShown(
        [recentSticker('a'), recentSticker('gone'), gif],
        ['a'],
        ['l:a']
      )
    ).toBe(false);
    expect(isRecentSectionShown([], ['a'], [])).toBe(false);
  });
});

describe('fileImportFailure', () => {
  it('ошибка проверки файла — её текст, «Импорт» недоступна до другого файла', () => {
    expect(fileImportFailure('file', new Error('Файл повреждён'))).toEqual({
      message: 'Файл повреждён',
      isRetryable: false,
    });
  });

  it('нехватка места при записи — своя ошибка, повтор доступен', () => {
    expect(
      fileImportFailure('write', new DOMException('quota', 'QuotaExceededError'))
    ).toEqual({
      message: t('error.libraryFile.quota'),
      isRetryable: true,
    });
  });

  it('другой сбой записи — «не удалось записать» с причиной, повтор доступен', () => {
    expect(fileImportFailure('write', new DOMException('aborted', 'AbortError'))).toEqual(
      {
        message: t('error.libraryFile.writeFailed', { message: 'aborted' }),
        isRetryable: true,
      }
    );
  });

  it('сбой чтения библиотеки — его текст, повтор доступен', () => {
    expect(fileImportFailure('library', new Error('IDB закрыта'))).toEqual({
      message: 'IDB закрыта',
      isRetryable: true,
    });
  });

  it('на английском — английский текст записи', () => {
    setLocale('en');

    expect(
      fileImportFailure('write', new DOMException('quota', 'QuotaExceededError')).message
    ).toBe(EN['error.libraryFile.quota']);
  });
});

type RunOverrides = Partial<
  Pick<FileImportRun, 'loadCard' | 'prepare' | 'write' | 'refreshPacks' | 'errorTarget'>
>;

/**
 * Ход импорта с журналом колбэков.
 *
 * @param overrides — подмена шагов
 * @returns журнал, отмена и запуск
 */
const fileRun = (overrides: RunOverrides = {}) => {
  const calls: string[] = [];
  const controller = new AbortController();
  const write = vi.fn(
    overrides.write ||
      (async () => {
        return WRITTEN;
      })
  );

  const start = () => {
    return runFileImport({
      libraryFile: LIBRARY_FILE,
      signal: controller.signal,
      loadCard:
        overrides.loadCard ||
        (async () => {
          return cardWith(2);
        }),
      prepare:
        overrides.prepare ||
        (async (_file, _card, { onProgress }) => {
          onProgress?.({ done: 0, total: 2 });
          onProgress?.({ done: 2, total: 2 });

          return PLAN;
        }),
      write,
      refreshPacks:
        overrides.refreshPacks ||
        (async () => {
          calls.push('refresh');

          return FEED_PACKS;
        }),
      errorTarget:
        overrides.errorTarget ||
        ((): ImportErrorTarget => {
          return 'field';
        }),
      onStart: () => {
        calls.push('start');
      },
      onCard: (card) => {
        calls.push(`card ${card.newStickerCount}`);
      },
      onProgress: ({ done, total }) => {
        calls.push(`progress ${done}/${total}`);
      },
      onWriting: () => {
        calls.push('writing');
      },
      onSuccess: (written, packs) => {
        calls.push(`success ${written.stickerCount} ${packs.length}`);
      },
      onError: ({ message, isRetryable }, target) => {
        calls.push(`error ${target} ${message} ${isRetryable ? 'retry' : 'blocked'}`);
      },
      onCancel: () => {
        calls.push('cancel');
      },
      onFinish: () => {
        calls.push('finish');
      },
    });
  };

  return { calls, controller, write, start };
};

describe('fileImportStatus', () => {
  it('сегмент «Файл» на виду — строка статуса ход не дублирует на любом этапе', () => {
    expect(fileImportStatus('checking', { done: 3, total: 10 }, true)).toBeNull();
    expect(fileImportStatus('writing', null, true)).toBeNull();
  });

  it('проверка вне сегмента — ход «N/M»', () => {
    expect(fileImportStatus('checking', { done: 3, total: 10 }, false)).toBe(
      t('status.fileImportProgress', { done: 3, total: 10 })
    );
  });

  it('проверка вне сегмента до первого хода — пусто', () => {
    expect(fileImportStatus('checking', null, false)).toBeNull();
  });

  it('запись вне сегмента — «Запись…»', () => {
    expect(fileImportStatus('writing', null, false)).toBe(t('status.fileImportWriting'));
  });
});

describe('runFileImport', () => {
  it('успех — карточка пересчитана, проверка, запись, паки перечитаны, итог', async () => {
    const { calls, start } = fileRun();

    await start();

    expect(calls).toEqual([
      'start',
      'card 2',
      'progress 0/2',
      'progress 2/2',
      'writing',
      'refresh',
      'success 7 3',
      'finish',
    ]);
  });

  it('сбой перечитывания паков после записи — не ошибка импорта: итог есть, сбой — в консоль', async () => {
    const failure = new Error('база недоступна');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
    const { calls, start } = fileRun({
      refreshPacks: async () => {
        throw failure;
      },
    });

    await start();

    expect(calls).toEqual([
      'start',
      'card 2',
      'progress 0/2',
      'progress 2/2',
      'writing',
      'success 7 0',
      'finish',
    ]);
    expect(warn).toHaveBeenCalledWith(expect.any(String), failure);
    warn.mockRestore();
  });

  it('по свежей сверке добавлять нечего — без проверки и записи, карточка обновлена', async () => {
    const { calls, write, start } = fileRun({
      loadCard: async () => {
        return cardWith(0);
      },
    });

    await start();

    expect(write).not.toHaveBeenCalled();
    expect(calls).toEqual(['start', 'card 0', 'finish']);
  });

  it('стикеры уже в библиотеке, но добавится избранное или недавние — проверка и запись идут', async () => {
    for (const lists of [{ newFavoriteCount: 1 }, { newRecentCount: 1 }]) {
      const { write, start } = fileRun({
        loadCard: async () => {
          return cardWith(0, lists);
        },
      });

      await start();

      expect(write).toHaveBeenCalledWith(PLAN);
    }
  });

  it('отмена во время проверки — onCancel, записи нет', async () => {
    const { calls, controller, write, start } = fileRun({
      prepare: async (_file, _card, { signal }) => {
        controller.abort();
        signal?.throwIfAborted();

        return PLAN;
      },
    });

    await start();

    expect(write).not.toHaveBeenCalled();
    expect(calls).toEqual(['start', 'card 2', 'cancel', 'finish']);
  });

  it('ошибка проверки — у зоны, «Импорт» недоступна до другого файла', async () => {
    const { calls, write, start } = fileRun({
      prepare: async () => {
        throw new Error('Файл повреждён');
      },
    });

    await start();

    expect(write).not.toHaveBeenCalled();
    expect(calls).toEqual([
      'start',
      'card 2',
      'error field Файл повреждён blocked',
      'finish',
    ]);
  });

  it('ошибка записи после ухода с сегмента — в статус, повтор доступен', async () => {
    const { calls, start } = fileRun({
      write: async () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      errorTarget: () => {
        return 'status';
      },
    });

    await start();

    expect(calls).toContain(`error status ${t('error.libraryFile.quota')} retry`);
    expect(calls).not.toContain('refresh');
  });

  it('«Отменить» во время записи не превращает исход в отмену: запись довершается успехом', async () => {
    const { calls, controller, start } = fileRun({
      write: async () => {
        controller.abort();

        return WRITTEN;
      },
    });

    await start();

    expect(calls).toContain('success 7 3');
    expect(calls).not.toContain('cancel');
  });

  it('сбой записи после «Отменить» — ошибка записи, а не «Импорт отменён»', async () => {
    const { calls, controller, start } = fileRun({
      write: async () => {
        controller.abort();

        throw new DOMException('quota', 'QuotaExceededError');
      },
    });

    await start();

    expect(calls).not.toContain('cancel');
    expect(calls).toContain(`error field ${t('error.libraryFile.quota')} retry`);
  });

  it('сбой свежей сверки — ошибка без проверки и записи, повтор доступен', async () => {
    const { calls, write, start } = fileRun({
      loadCard: async () => {
        throw new Error('база недоступна');
      },
    });

    await start();

    expect(write).not.toHaveBeenCalled();
    expect(calls).toEqual(['start', 'error field база недоступна retry', 'finish']);
  });

  it('проверка упала своей ошибкой после «Отменить» — отмена, а не ошибка', async () => {
    const { calls, controller, start } = fileRun({
      prepare: async () => {
        controller.abort();

        throw new Error('чтение оборвано');
      },
    });

    await start();

    expect(calls).toEqual(['start', 'card 2', 'cancel', 'finish']);
  });

  it('цель ошибки берётся в момент завершения', async () => {
    let target: ImportErrorTarget = 'field';
    const { calls, start } = fileRun({
      prepare: async () => {
        target = 'status';

        throw new Error('сбой');
      },
      errorTarget: () => {
        return target;
      },
    });

    await start();

    expect(calls).toContain('error status сбой blocked');
  });
});
