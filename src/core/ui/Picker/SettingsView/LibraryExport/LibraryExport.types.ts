import type { ExportProgress } from '@core/libraryFile';

/**
 * Что нужно тексту рядом с кнопкой выгрузки библиотеки.
 */
export type LibraryNoteState = {
  /**
   * Идёт любая выгрузка — пака из меню или библиотеки.
   */
  isExporting: boolean;

  /**
   * Ход выгрузки библиотеки; `null` — библиотека не выгружается.
   */
  progress: ExportProgress | null;

  /**
   * Стикеров, записей избранного и недавних GIF в библиотеке — того, что попадёт в файл; `null` — ещё не посчитаны.
   */
  exportableCount: number | null;
};
