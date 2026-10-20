import { t } from '@core/i18n';
import type { LibraryNoteState } from '@ui/SettingsView/LibraryExport';

/**
 * Текст рядом с кнопкой: ход выгрузки библиотеки важнее причины недоступности — пока она идёт, выгружать есть что.
 * Выгрузка библиотеки без хода (файл только с GIF или сборка ещё не дошла до стикеров) говорит о себе, а не о паке.
 * Выгрузка пака из меню хода здесь не показывает (он в строке статуса), но недоступную кнопку объясняет: иначе
 * скринридер прочитал бы «недоступна» без причины.
 *
 * @param state — какая выгрузка идёт, ход выгрузки библиотеки и сколько в библиотеке того, что попадёт в файл
 * @returns текст; пустая строка — пояснять нечего
 */
export const libraryNoteText = (state: LibraryNoteState) => {
  const { isExporting, isLibraryExporting, progress, exportableCount } = state;

  if (progress) return t('settings.library.progress', progress);
  if (isLibraryExporting) return t('settings.library.exporting');
  if (isExporting) return t('settings.library.packExporting');
  if (exportableCount === 0) return t('settings.library.empty');

  return '';
};
