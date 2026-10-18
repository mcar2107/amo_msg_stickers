import type { Pack } from '@core/db.types';
import type {
  FileImportProgress,
  ImportPlan,
  PrepareImportOptions,
} from '@core/libraryFile';
import type { FileCard, LibraryFile } from '@core/libraryFile';
import type { ImportWritten } from '@core/libraryFile/importRecords';
import type { FileImportFailure } from '@ui/PickerProvider/fileImportOutcome';
import type { ImportErrorTarget } from '@ui/PickerProvider/finishImport';

export type FileImportRun = {
  /**
   * Прочитанный файл.
   */
  libraryFile: LibraryFile;

  /**
   * Отмена импорта: действует до записи, исход после отмены — `onCancel`.
   */
  signal: AbortSignal;

  /**
   * Сверяет файл с библиотекой в её текущем состоянии.
   */
  loadCard: (libraryFile: LibraryFile) => Promise<FileCard>;

  /**
   * Проверяет новые стикеры карточки и собирает план импорта, ничего не записывая.
   */
  prepare: (
    libraryFile: LibraryFile,
    card: FileCard,
    options: PrepareImportOptions
  ) => Promise<ImportPlan>;

  /**
   * Записывает план одной транзакцией.
   */
  write: (plan: ImportPlan) => Promise<ImportWritten>;

  /**
   * Перечитывает паки и отдаёт их в порядке ленты.
   */
  refreshPacks: () => Promise<Pack[]>;

  /**
   * Куда показать ошибку в момент завершения импорта.
   */
  errorTarget: () => ImportErrorTarget;

  /**
   * Импорт начался: идёт сверка с библиотекой.
   */
  onStart: () => void;

  /**
   * Карточка пересчитана по библиотеке в момент нажатия «Импорт».
   */
  onCard: (card: FileCard) => void;

  /**
   * Ход проверки стикеров.
   */
  onProgress: (progress: FileImportProgress) => void;

  /**
   * Проверка закончена, идёт запись: отменить её уже нельзя.
   */
  onWriting: () => void;

  /**
   * Записано, паки перечитаны.
   *
   * @param written — что записал импорт
   * @param packs — паки библиотеки в порядке ленты; пустой список — перечитать не удалось
   */
  onSuccess: (written: ImportWritten, packs: Pack[]) => void;

  /**
   * Импорт не удался; библиотека как до него.
   */
  onError: (failure: FileImportFailure, target: ImportErrorTarget) => void;

  /**
   * Импорт отменён до записи. Не ошибка: ни `onError`, ни `onSuccess` не зовутся.
   */
  onCancel: () => void;

  /**
   * Начатый импорт завершился любым исходом, в том числе когда по свежей сверке добавлять нечего.
   */
  onFinish: () => void;
};
