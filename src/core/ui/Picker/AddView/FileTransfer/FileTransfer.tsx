import type { FunctionComponent as FC } from 'preact';
import { useRef } from 'preact/hooks';

import { t } from '../../../../i18n/translate';
import { LinkButton } from '../../LinkButton/LinkButton';
import { usePicker } from '../../PickerProvider/usePicker';
import { usePickerView } from '../../usePickerView/usePickerView';

import { FileDropZone } from './FileDropZone/FileDropZone';
import { ImportCard } from './ImportCard/ImportCard';
import { useImportEndFocus } from './useImportEndFocus/useImportEndFocus';

/**
 * Панель сегмента «Файл»: загрузка файла выгрузки — зона с карточкой «что добавится» на её месте и ошибка. Файл,
 * карточку и ход импорта держит провайдер — они переживают смену сегмента и уход с экрана, — а «Импорт» стоит в футере
 * экрана.
 *
 * Выгрузка библиотеки живёт в «Настройках», а сюда ведёт ссылка в строке заголовка: её ищут рядом с загрузкой, а
 * отдельная группа выгрузки не дала бы сегменту поместиться в панель без прокрутки. Ссылка открывает «Настройки» с
 * фокусом на «Выгрузить библиотеку».
 *
 * Ошибка чтения стоит без карточки — читать нечего; ошибка записи — под зоной с карточкой: файл остаётся, и импорт можно
 * повторить.
 *
 * Свободное место делит только зона: заголовок и ошибка держат свою высоту, и зона с карточкой растёт по содержимому до
 * места, что осталось от них, вкладок и строки статуса в теле экрана, — дальше прокручивается список паков внутри неё.
 * Панель не ниже заголовка, зоны наименьшей высоты и ошибки: если они не помещаются над строкой статуса, прокручивается
 * тело экрана, и ничего не уходит под строку статуса.
 */
export const FileTransfer: FC = () => {
  const {
    fileImport: {
      fileName,
      card,
      isReading,
      error,
      stage,
      progress,
      isImporting,
      pickFile,
    },
  } = usePicker();
  const { openScreen } = usePickerView();
  const panelRef = useRef<HTMLDivElement>(null);

  useImportEndFocus(panelRef, isImporting);

  const handleZonePick = (file: File | undefined) => {
    pickFile(file);
  };

  const handleExportLinkClick = () => {
    openScreen('settings', { focus: 'libraryExport' });
  };

  return (
    <div ref={panelRef} className="flex grow flex-col gap-2">
      <div className="mt-1.5 flex shrink-0 items-baseline justify-between gap-2">
        <h3 className="m-0 min-w-0 truncate text-xsm font-bold">
          {t('add.file.importTitle')}
        </h3>

        <LinkButton onClick={handleExportLinkClick}>{t('add.file.toExport')}</LinkButton>
      </div>

      <FileDropZone
        fileName={fileName}
        card={
          card || isReading ? (
            <ImportCard card={card} stage={stage} progress={progress} />
          ) : null
        }
        isDisabled={isImporting}
        onPick={handleZonePick}
      />

      {error && (
        <p role="alert" className="m-0 shrink-0 text-xs leading-[1.4] text-red-30">
          {error}
        </p>
      )}
    </div>
  );
};
