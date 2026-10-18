import type { FileCard, FileImportProgress } from '@core/libraryFile';
import type { FileImportStage } from '@ui/PickerProvider';

export type ImportCardProps = {
  /**
   * Сверка файла с библиотекой; `null` — файл ещё читается.
   */
  card: FileCard | null;

  /**
   * Этап идущего импорта; `null` — импорт не идёт, и вместо хода показан итог.
   */
  stage: FileImportStage | null;

  /**
   * Ход проверки стикеров; `null` — проверка ещё не сообщила о первом стикере или не идёт.
   */
  progress: FileImportProgress | null;
};
