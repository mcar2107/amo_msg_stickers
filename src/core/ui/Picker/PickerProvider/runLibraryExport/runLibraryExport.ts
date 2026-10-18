import { t } from '@core/i18n';
import type { ExportProgress } from '@core/libraryFile';
import { errorMessage } from '@ui/PickerProvider/errorMessage';

import type { ExportTarget, LibraryExportRun } from './runLibraryExport.types';

/**
 * Ход выгрузки для строки статуса.
 *
 * @param target — что выгружается
 * @param progress — сколько стикеров упаковано из скольких
 * @returns текст статуса
 */
const progressText = (target: ExportTarget, { done, total }: ExportProgress) => {
  switch (target.kind) {
    case 'pack': {
      return t('status.exportProgress', { title: target.title, done, total });
    }

    case 'library': {
      return t('status.exportLibraryProgress', { done, total });
    }

    default: {
      const unknownTarget: never = target;

      throw new Error(`Unknown export target: ${String(unknownTarget)}`);
    }
  }
};

/**
 * Итог выгрузки для строки статуса.
 *
 * @param target — что выгружалось
 * @param stickerCount — стикеров в файле
 * @returns текст статуса
 */
const doneText = (target: ExportTarget, stickerCount: number) => {
  switch (target.kind) {
    case 'pack': {
      return t('status.exportDone', { title: target.title });
    }

    case 'library': {
      return t('status.exportLibraryDone', { count: stickerCount });
    }

    default: {
      const unknownTarget: never = target;

      throw new Error(`Unknown export target: ${String(unknownTarget)}`);
    }
  }
};

/**
 * Одна выгрузка от начала до итога: ход по стикерам в статусе, скачивание готового файла и «выгружен» — только после
 * того, как скачивание запущено. Сбой сборки или скачивания — ошибка в статусе, неполный файл не скачивается.
 * Промис не отклоняется.
 *
 * @param run — что выгружать, сборка файла, скачивание и статусы
 */
export const runLibraryExport = async (run: LibraryExportRun): Promise<void> => {
  const { target, exportFile, download, showStatus, showError } = run;
  const packId = target.kind === 'pack' ? target.packId : undefined;

  const handleProgress = (progress: ExportProgress) => {
    showStatus(progressText(target, progress));
  };

  try {
    const { blob, fileName, stickerCount } = await exportFile({
      ...(packId === undefined ? {} : { packId }),
      onProgress: handleProgress,
    });

    download(blob, fileName);
    showStatus(doneText(target, stickerCount));
  } catch (error) {
    showError(t('status.exportFailed', { message: errorMessage(error) }));
  }
};
