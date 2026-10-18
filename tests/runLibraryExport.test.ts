import { afterEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '@core/i18n';
import type { ExportOptions, LibraryExport } from '@core/libraryFile';
import type { ExportTarget } from '@ui/PickerProvider/runLibraryExport';
import { runLibraryExport } from '@ui/PickerProvider/runLibraryExport';

const PACK: ExportTarget = { kind: 'pack', packId: 'tg:cats', title: 'Коты' };
const LIBRARY: ExportTarget = { kind: 'library' };

/**
 * Колбэки выгрузки с общим журналом: порядок хода, скачивания и итога важен.
 *
 * @param result — исход сборки файла: готовый файл или ошибка
 * @returns колбэки и журнал
 */
const callbacks = (result: LibraryExport | Error) => {
  const calls: string[] = [];
  const exportFile = vi.fn(async (options: ExportOptions) => {
    const { onProgress } = options;

    onProgress?.({ done: 0, total: 2 });
    onProgress?.({ done: 2, total: 2 });

    if (result instanceof Error) throw result;

    return result;
  });
  const download = vi.fn((blob: Blob, name: string) => {
    calls.push(`download ${name} ${blob.size}`);
  });
  const showStatus = vi.fn((text: string) => {
    calls.push(`status ${text}`);
  });
  const showError = vi.fn((text: string) => {
    calls.push(`error ${text}`);
  });

  return { calls, exportFile, download, showStatus, showError };
};

const FILE: LibraryExport = {
  blob: new Blob(['abc']),
  fileName: 'Коты.amostickers',
  stickerCount: 2,
};

afterEach(() => {
  setLocale('ru');
});

describe('runLibraryExport', () => {
  it('пак: ход в статусе, скачивание готового файла, «Пак выгружен»', async () => {
    const run = callbacks(FILE);

    await runLibraryExport({ target: PACK, ...run });

    expect(run.exportFile).toHaveBeenCalledWith(
      expect.objectContaining({ packId: 'tg:cats' })
    );
    expect(run.calls).toEqual([
      'status Выгрузка «Коты»: 0/2',
      'status Выгрузка «Коты»: 2/2',
      'download Коты.amostickers 3',
      'status Пак «Коты» выгружен',
    ]);
  });

  it('библиотека: без packId, ход и итог с числом стикеров', async () => {
    const run = callbacks({
      ...FILE,
      fileName: 'amo-stickers-2026-10-15.amostickers',
      stickerCount: 43,
    });

    await runLibraryExport({ target: LIBRARY, ...run });

    expect(run.exportFile.mock.calls[0]?.[0].packId).toBeUndefined();
    expect(run.calls).toEqual([
      'status Выгрузка библиотеки: 0/2',
      'status Выгрузка библиотеки: 2/2',
      'download amo-stickers-2026-10-15.amostickers 3',
      'status Библиотека выгружена: стикеров 43',
    ]);
  });

  it('сбой сборки — ошибка в статусе, файл не скачивается, промис не отклоняется', async () => {
    const run = callbacks(new Error('Пак не помещается в один файл'));

    await expect(runLibraryExport({ target: PACK, ...run })).resolves.toBeUndefined();

    expect(run.download).not.toHaveBeenCalled();
    expect(run.showError).toHaveBeenCalledWith(
      'Не\u00a0удалось выгрузить: Пак не помещается в один файл'
    );
  });

  it('сбой скачивания — ошибка в статусе, «выгружен» не показывается', async () => {
    const run = callbacks(FILE);

    run.download.mockImplementation(() => {
      throw new Error('blocked');
    });

    await runLibraryExport({ target: PACK, ...run });

    expect(run.showError).toHaveBeenCalledWith('Не\u00a0удалось выгрузить: blocked');
    expect(run.showStatus).not.toHaveBeenCalledWith('Пак «Коты» выгружен');
  });

  it('на английском — английские статусы, название пака без перевода', async () => {
    setLocale('en');

    const run = callbacks(FILE);

    await runLibraryExport({ target: PACK, ...run });

    expect(run.showStatus).toHaveBeenLastCalledWith('Pack “Коты” exported');
  });
});
