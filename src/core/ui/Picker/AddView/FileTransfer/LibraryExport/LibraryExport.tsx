import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../../i18n/translate';
import type { ExportProgress } from '../../../../../libraryFile/exportLibrary.types';
import { Button } from '../../../Button/Button';
import { usePicker } from '../../../PickerProvider/usePicker';

import { useStickerCount } from './useStickerCount/useStickerCount';

const NOTE_CLASS = 'm-0 text-xs leading-[1.4] text-cadetGray-30 dark:text-gray-70';
const NOTE_ID = 'picker-add-file-export-note';

/**
 * Текст рядом с кнопкой: ход выгрузки библиотеки важнее причины недоступности — пока она идёт, стикеры есть.
 *
 * @param progress — ход выгрузки библиотеки
 * @param stickerCount — стикеров в библиотеке
 * @returns текст; пустая строка — пояснять нечего
 */
const noteText = (progress: ExportProgress | null, stickerCount: number | null) => {
  if (progress) return t('add.file.exportProgress', progress);
  if (stickerCount === 0) return t('add.file.exportEmpty');

  return '';
};

/**
 * Группа «Выгрузка в файл» сегмента «Файл»: что выгружается, кнопка и рядом — ход выгрузки или почему выгружать
 * нечего. Выгрузку держит провайдер, поэтому уход с экрана её не обрывает, а вернувшийся видит недоступную кнопку и
 * ход. Пока идёт любая выгрузка — пака из меню или библиотеки, — кнопка недоступна: вторая выгрузка не начинается.
 */
export const LibraryExport: FC = () => {
  const {
    libraryExport: { isExporting, libraryProgress, exportAll },
  } = usePicker();
  const stickerCount = useStickerCount();
  const note = noteText(libraryProgress, stickerCount);

  const handleExportClick = () => {
    void exportAll();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="mt-1.5 text-xsm font-bold">{t('add.file.exportTitle')}</h3>

      <p className={NOTE_CLASS}>{t('add.file.exportHint')}</p>

      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          isDisabled={isExporting || stickerCount === 0}
          shouldKeepFocus
          {...(note ? { describedBy: NOTE_ID } : {})}
          onClick={handleExportClick}
        >
          {t('add.file.export')}
        </Button>

        <p id={NOTE_ID} className={`${NOTE_CLASS} min-w-0 tabular-nums`}>
          {note}
        </p>
      </div>
    </div>
  );
};
