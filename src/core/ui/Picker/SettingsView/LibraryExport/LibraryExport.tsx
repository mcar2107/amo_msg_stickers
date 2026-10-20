import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import { Button } from '@ui/Button';
import { LinkButton } from '@ui/LinkButton';
import { usePicker } from '@ui/PickerProvider';
import { SCREEN_FOCUS_ID, usePickerView } from '@ui/usePickerView';

import { libraryNoteText } from './libraryNoteText';
import { useExportableCount } from './useExportableCount';

const GROUP_ID = 'settings-group-library';
const NOTE_ID = 'settings-library-export-note';
/**
 * Группа лежит под формой «Настроек», а не в ней, поэтому отступ от формы и боковой отступ — свои, те же, что у групп
 * формы (`gap-4`, `px-0.5`).
 */
const GROUP_CLASS = 'mt-4 flex flex-col gap-1.5 px-0.5';
const GROUP_TITLE_CLASS = 'm-0 font-primary text-xsm font-semibold';
const NOTE_CLASS = 'm-0 text-xs leading-[1.4] text-cadetGray-30 dark:text-gray-70';

/**
 * Группа «Библиотека» «Настроек»: что выгружается, кнопка и рядом — ход выгрузки или почему выгружать нечего. Выгрузку
 * держит провайдер, поэтому уход с экрана её не обрывает, а вернувшийся видит недоступную кнопку и ход. Пока идёт любая
 * выгрузка — пака из меню или библиотеки, — кнопка недоступна: вторая выгрузка не начинается.
 *
 * Под кнопкой — переход к загрузке файла: выгрузку ищут рядом с загрузкой, и кто пришёл за загрузкой в настройки,
 * найдёт её отсюда. Сегмент «Файл» ведёт сюда обратной ссылкой (цель фокуса `libraryExport` — id кнопки).
 */
export const LibraryExport: FC = () => {
  const {
    libraryExport: { isExporting, isLibraryExporting, libraryProgress, exportAll },
  } = usePicker();
  const { openScreen } = usePickerView();
  const exportableCount = useExportableCount();
  const note = libraryNoteText({
    isExporting,
    isLibraryExporting,
    progress: libraryProgress,
    exportableCount,
  });

  const handleExportClick = () => {
    void exportAll();
  };

  const handleImportClick = () => {
    openScreen('add', { segment: 'file' });
  };

  return (
    <section aria-labelledby={GROUP_ID} className={GROUP_CLASS}>
      <div className="flex flex-col gap-1">
        <h3 id={GROUP_ID} className={GROUP_TITLE_CLASS}>
          {t('settings.group.library')}
        </h3>

        <p className={NOTE_CLASS}>{t('settings.library.hint')}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          id={SCREEN_FOCUS_ID.libraryExport}
          isDisabled={isExporting || exportableCount === 0}
          shouldKeepFocus
          {...(note ? { describedBy: NOTE_ID } : {})}
          onClick={handleExportClick}
        >
          {t('settings.library.export')}
        </Button>

        <p id={NOTE_ID} className={`${NOTE_CLASS} min-w-0 tabular-nums`}>
          {note}
        </p>
      </div>

      <p className="m-0">
        <LinkButton onClick={handleImportClick}>
          {t('settings.library.import')}
        </LinkButton>
      </p>
    </section>
  );
};
