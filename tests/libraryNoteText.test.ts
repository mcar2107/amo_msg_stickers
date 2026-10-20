import { afterEach, describe, expect, it } from 'vitest';

import { setLocale, t } from '@core/i18n';
import type { LibraryNoteState } from '@ui/SettingsView/LibraryExport';
import { libraryNoteText } from '@ui/SettingsView/LibraryExport/libraryNoteText';

/**
 * Состояние без выгрузки, с библиотекой, где есть что выгружать.
 */
const IDLE: LibraryNoteState = {
  isExporting: false,
  isLibraryExporting: false,
  progress: null,
  exportableCount: 3,
};

afterEach(() => {
  setLocale('ru');
});

describe('libraryNoteText', () => {
  it('ход выгрузки библиотеки — «Выгрузка: N/M»', () => {
    expect(
      libraryNoteText({
        ...IDLE,
        isExporting: true,
        isLibraryExporting: true,
        progress: { done: 2, total: 5 },
      })
    ).toBe(t('settings.library.progress', { done: 2, total: 5 }));
  });

  it('выгрузка библиотеки без хода — о библиотеке, а не о паке', () => {
    expect(
      libraryNoteText({ ...IDLE, isExporting: true, isLibraryExporting: true })
    ).toBe('Выгрузка…');
  });

  it('выгрузка пака — объяснение недоступной кнопки', () => {
    expect(libraryNoteText({ ...IDLE, isExporting: true })).toBe(
      t('settings.library.packExporting')
    );
  });

  it('выгружать нечего — пояснение, иначе пусто', () => {
    expect(libraryNoteText({ ...IDLE, exportableCount: 0 })).toBe(
      t('settings.library.empty')
    );
    expect(libraryNoteText(IDLE)).toBe('');
  });

  it('на английском — английский текст', () => {
    setLocale('en');

    expect(
      libraryNoteText({ ...IDLE, isExporting: true, isLibraryExporting: true })
    ).toBe('Exporting…');
  });
});
