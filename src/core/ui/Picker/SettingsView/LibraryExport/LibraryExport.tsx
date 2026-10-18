import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import { Button } from '@ui/Button';
import { LinkButton } from '@ui/LinkButton';
import { usePicker } from '@ui/PickerProvider';
import { SCREEN_FOCUS_ID } from '@ui/usePickerView';
import { usePickerView } from '@ui/usePickerView';

import type { LibraryNoteState } from './LibraryExport.types';
import { useStickerCount } from './useStickerCount';

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
 * Текст рядом с кнопкой: ход выгрузки библиотеки важнее причины недоступности — пока она идёт, стикеры есть. Выгрузка
 * пака из меню хода здесь не показывает (он в строке статуса), но недоступную кнопку объясняет: иначе скринридер
 * прочитал бы «недоступна» без причины.
 *
 * @param state — идёт ли выгрузка, ход выгрузки библиотеки и число стикеров в библиотеке
 * @returns текст; пустая строка — пояснять нечего
 */
const noteText = (state: LibraryNoteState) => {
  const { isExporting, progress, stickerCount } = state;

  if (progress) return t('settings.library.progress', progress);
  if (isExporting) return t('settings.library.packExporting');
  if (stickerCount === 0) return t('settings.library.empty');

  return '';
};

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
    libraryExport: { isExporting, libraryProgress, exportAll },
  } = usePicker();
  const { openScreen } = usePickerView();
  const stickerCount = useStickerCount();
  const note = noteText({ isExporting, progress: libraryProgress, stickerCount });

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
          isDisabled={isExporting || stickerCount === 0}
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
