import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';
import { usePicker } from '../../PickerProvider/usePicker';

import { FileDropZone } from './FileDropZone/FileDropZone';
import { ImportCard } from './ImportCard/ImportCard';
import { LibraryExport } from './LibraryExport/LibraryExport';

/**
 * Панель сегмента «Файл»: загрузка файла выгрузки — зона, карточка «что добавится» и ошибка — и выгрузка всей
 * библиотеки. Фрагмент, а не обёртка: группы ложатся в форму сегмента с её отступами. Файл, карточку и ход импорта
 * держит провайдер — они переживают смену сегмента и уход с экрана, — а «Импорт» стоит в футере экрана.
 *
 * Ошибка чтения стоит без карточки — читать нечего; ошибка записи — под карточкой: файл остаётся, и импорт можно
 * повторить.
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

  const handleZonePick = (file: File | undefined) => {
    pickFile(file);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h3 className="mt-1.5 text-xsm font-bold">{t('add.file.importTitle')}</h3>

        <FileDropZone
          hasFile={Boolean(fileName)}
          isDisabled={isImporting}
          onPick={handleZonePick}
        />

        {fileName && (card || isReading) && (
          <ImportCard fileName={fileName} card={card} stage={stage} progress={progress} />
        )}

        {error && (
          <p role="alert" className="m-0 text-xs leading-[1.4] text-red-30">
            {error}
          </p>
        )}
      </div>

      <LibraryExport />
    </>
  );
};
