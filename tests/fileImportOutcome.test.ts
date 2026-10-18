import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Pack } from '@core/db.types';
import { EN } from '@core/i18n';
import { setLocale, t } from '@core/i18n';
import type { ImportPlan } from '@core/libraryFile';
import type { FileCard, LibraryFile } from '@core/libraryFile';
import { FORMAT_NAME } from '@core/libraryFile';
import type { ImportWritten } from '@core/libraryFile/importRecords';
import {
  fileImportFailure,
  fileImportStatus,
  finishFileImport,
  firstAddedSection,
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
 * Карточка с заданным числом новых стикеров: ход импорта читает только его.
 *
 * @param newStickerCount — стикеров, которых нет в библиотеке
 * @returns карточка
 */
const cardWith = (newStickerCount: number): FileCard => {
  return { packs: [], stickerCount: newStickerCount, newStickerCount, newPackCount: 0 };
};

const PLAN: ImportPlan = { packs: [] };
const WRITTEN: ImportWritten = { packIds: ['tg:cats', 'custom'], stickerCount: 7 };

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
 * Колбэки провайдера с общим журналом: порядок перехода и статуса важен.
 *
 * @returns колбэки и журнал
 */
const viewCallbacks = () => {
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
  };
};

describe('finishFileImport', () => {
  it('экран «Добавить стикеры» открыт — мгновенный переход к первому разделу ленты с фокусом на его вкладку, затем статус', () => {
    const { calls, scrollToSection, showStatus } = viewCallbacks();

    finishFileImport({
      screen: 'add',
      packs: FEED_PACKS,
      written: WRITTEN,
      scrollToSection,
      showStatus,
    });

    expect(calls).toEqual([
      'scroll custom instant focus-tab',
      'status Добавлено стикеров: 7',
    ]);
  });

  it('другой экран или режим — только статус, пользователь остаётся на месте', () => {
    for (const screen of ['settings', null] as const) {
      const { calls, scrollToSection, showStatus } = viewCallbacks();

      finishFileImport({
        screen,
        packs: FEED_PACKS,
        written: WRITTEN,
        scrollToSection,
        showStatus,
      });

      expect(scrollToSection).not.toHaveBeenCalled();
      expect(calls).toEqual(['status Добавлено стикеров: 7']);
    }
  });

  it('ничего не записано — перехода нет, статус с нулём', () => {
    const { calls, scrollToSection, showStatus } = viewCallbacks();

    finishFileImport({
      screen: 'add',
      packs: FEED_PACKS,
      written: { packIds: [], stickerCount: 0 },
      scrollToSection,
      showStatus,
    });

    expect(calls).toEqual(['status Добавлено стикеров: 0']);
  });

  it('на английском — английский статус', () => {
    setLocale('en');

    const { showStatus, scrollToSection } = viewCallbacks();

    finishFileImport({
      screen: null,
      packs: FEED_PACKS,
      written: WRITTEN,
      scrollToSection,
      showStatus,
    });

    expect(showStatus).toHaveBeenCalledWith('Stickers added: 7');
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
