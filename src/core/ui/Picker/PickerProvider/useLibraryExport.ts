import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

import { downloadBlob } from '../../../download';
import { exportLibrary } from '../../../libraryFile/exportLibrary';

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
 * @returns признак идущей выгрузки и её запуск
 */
export const useLibraryExport = (options: LibraryExportOptions): LibraryExportState => {
  const { showStatus, showError } = options;
  const [isExporting, setIsExporting] = useState(false);
  const exportingRef = useRef(false);

  const start = useCallback(
    async (target: ExportTarget) => {
      if (exportingRef.current) return;

      exportingRef.current = true;
      setIsExporting(true);

      try {
        await runLibraryExport({
          target,
          exportFile: exportLibrary,
          download: downloadBlob,
          showStatus,
          showError,
        });
      } finally {
        exportingRef.current = false;
        setIsExporting(false);
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
    return { isExporting, exportPack, exportAll };
  }, [isExporting, exportPack, exportAll]);
};
