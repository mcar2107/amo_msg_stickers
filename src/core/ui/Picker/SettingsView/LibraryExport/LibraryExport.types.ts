import type { ExportProgress } from '../../../../libraryFile/exportLibrary.types';

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
   * Стикеров в библиотеке; `null` — ещё не посчитаны.
   */
  stickerCount: number | null;
};
