import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

import { downloadBlob } from '../../../download';
import { exportLibrary } from '../../../libraryFile/exportLibrary';
import type {
  ExportOptions,
  ExportProgress,
} from '../../../libraryFile/exportLibrary.types';

import { runLibraryExport } from './runLibraryExport/runLibraryExport';
import type { ExportTarget } from './runLibraryExport/runLibraryExport.types';
import type { LibraryExportOptions, LibraryExportState } from './PickerProvider.types';

/**
 * Выгрузка пака или библиотеки в файл на уровне провайдера. Провайдер живёт всё время страницы, а меню пака,
 * ячейки ленты под виртуализацией и экран «Добавить стикеры» размонтируются: состояние в них не пережило бы закрытия
 * меню, прокрутки и «Назад», и вторая выгрузка шла бы поверх первой — браузер спросил бы о нескольких скачиваниях.
 *
 * Занятость держит `ref`, а не только состояние: два нажатия в одном кадре видят её до перерисовки.
 *
 * @param options — статусы провайдера
 * @returns признак идущей выгрузки, ход выгрузки библиотеки и её запуск
 */
export const useLibraryExport = (options: LibraryExportOptions): LibraryExportState => {
  const { showStatus, showError } = options;
  const [isExporting, setIsExporting] = useState(false);
  const [libraryProgress, setLibraryProgress] = useState<ExportProgress | null>(null);
  const exportingRef = useRef(false);

  const start = useCallback(
    async (target: ExportTarget) => {
      if (exportingRef.current) return;

      exportingRef.current = true;
      setIsExporting(true);

      /**
       * Ход библиотеки нужен и сегменту «Файл» рядом с кнопкой, а не только строке статуса: сборка файла идёт долго,
       * и кнопка без хода выглядела бы сломанной.
       */
      const exportFile = (exportOptions: ExportOptions) => {
        const { onProgress } = exportOptions;

        return exportLibrary({
          ...exportOptions,
          onProgress: (progress) => {
            if (target.kind === 'library') setLibraryProgress(progress);
            onProgress?.(progress);
          },
        });
      };

      try {
        await runLibraryExport({
          target,
          exportFile,
          download: downloadBlob,
          showStatus,
          showError,
        });
      } finally {
        exportingRef.current = false;
        setIsExporting(false);
        setLibraryProgress(null);
      }
    },
    [showStatus, showError]
  );

  const exportPack = useCallback(
    (packId: string, title: string) => {
      return start({ kind: 'pack', packId, title });
    },
    [start]
  );

  const exportAll = useCallback(() => {
    return start({ kind: 'library' });
  }, [start]);

  return useMemo(() => {
    return { isExporting, libraryProgress, exportPack, exportAll };
  }, [isExporting, libraryProgress, exportPack, exportAll]);
};
