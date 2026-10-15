import type {
  ExportOptions,
  LibraryExport,
} from '../../../../libraryFile/exportLibrary.types';

/**
 * Что выгружается: пак с названием для статусов или вся библиотека.
 */
export type ExportTarget =
  | {
      /**
       * Выгружается один пак.
       */
      kind: 'pack';

      /**
       * Id выгружаемого пака.
       */
      packId: string;

      /**
       * Название пака на языке интерфейса — для хода и итога в статусе.
       */
      title: string;
    }
  | {
      /**
       * Выгружается вся библиотека.
       */
      kind: 'library';
    };

export type LibraryExportRun = {
  /**
   * Что выгружается.
   */
  target: ExportTarget;

  /**
   * Собирает файл выгрузки и сообщает ход по стикерам. Отклоняется ошибкой на языке интерфейса.
   */
  exportFile: (options: ExportOptions) => Promise<LibraryExport>;

  /**
   * Сохраняет готовый файл обычным скачиванием браузера.
   */
  download: (blob: Blob, name: string) => void;

  /**
   * Показывает ход и итог в статусе.
   */
  showStatus: (text: string) => void;

  /**
   * Показывает ошибку выгрузки в статусе.
   */
  showError: (text: string) => void;
};
