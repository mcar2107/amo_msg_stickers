import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

import { downloadBlob } from '@core/download';
import type { ExportOptions, ExportProgress } from '@core/libraryFile';
import { exportLibrary } from '@core/libraryFile';

import type { LibraryExportOptions, LibraryExportState } from './PickerProvider.types';
import type { ExportTarget } from './runLibraryExport';
import { runLibraryExport } from './runLibraryExport';

/**
 * Выгрузка пака или библиотеки в файл на уровне провайдера. Провайдер живёт всё время страницы, а меню пака,
 * ячейки ленты под виртуализацией и экран «Настройки» размонтируются: состояние в них не пережило бы закрытия
 * меню, прокрутки и «Назад», и вторая выгрузка шла бы поверх первой — браузер спросил бы о нескольких скачиваниях.
 *
 * Занятость держит `ref`, а не только состояние: два нажатия в одном кадре видят её до перерисовки.
 *
 * @param options — статусы провайдера
 * @returns признаки идущей выгрузки и выгрузки библиотеки, ход выгрузки библиотеки и её запуск
 */
export const useLibraryExport = (options: LibraryExportOptions): LibraryExportState => {
  const { showStatus, showError } = options;
  const [isExporting, setIsExporting] = useState(false);
  const [isLibraryExporting, setIsLibraryExporting] = useState(false);
  const [libraryProgress, setLibraryProgress] = useState<ExportProgress | null>(null);
  const exportingRef = useRef(false);

  const start = useCallback(
    async (target: ExportTarget) => {
      if (exportingRef.current) return;

      exportingRef.current = true;
      setIsExporting(true);
      setIsLibraryExporting(target.kind === 'library');

      /**
       * Ход библиотеки нужен и группе «Библиотека» «Настроек» рядом с кнопкой, а не только строке статуса: сборка
       * файла идёт долго, и кнопка без хода выглядела бы сломанной.
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
        setIsLibraryExporting(false);
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
    return { isExporting, isLibraryExporting, libraryProgress, exportPack, exportAll };
  }, [isExporting, isLibraryExporting, libraryProgress, exportPack, exportAll]);
};
