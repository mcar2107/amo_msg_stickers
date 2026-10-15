import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC, TargetedDragEvent, TargetedEvent } from 'preact';
import { useRef, useState } from 'preact/hooks';

import { t } from '../../../../../i18n/translate';
import { usePicker } from '../../../PickerProvider/usePicker';

import type { FileDropZoneProps } from './FileDropZone.types';

/**
 * Вид — как у зоны своего стикера, но ниже: превью у файла выгрузки нет, а место сегмента занимают карточка и
 * выгрузка. Цвета обычной и подсвеченной зоны — взаимоисключающие наборы, длительность — под `motion-safe:`, как у
 * перехода.
 */
const zoneVariants = cva(
  [
    'flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-lgx border-[1.5px] border-dashed p-3',
    'text-center text-xs',
    'motion-safe:transition-[color,background-color,border-color] motion-safe:duration-base',
  ].join(' '),
  {
    variants: {
      isDragOver: {
        true: 'border-blue-50 bg-blue-50/[.06] text-blue-50 dark:border-beige-70 dark:bg-beige-70/[.06] dark:text-beige-70',
        false:
          'border-cadetGray-30/[.28] text-cadetGray-30 dark:border-white-0/[.1] dark:text-gray-70',
      },
    },
  }
);

/**
 * Кнопка выбора — нейтральная, а не основная `Button`: кольцо фокуса панели на акцентной заливке не видно, и
 * главная кнопка экрана — «Импорт» в футере.
 */
const CHOOSE_BUTTON_CLASS = [
  'h-8 shrink-0 cursor-pointer rounded-lg px-3.5 font-primary text-xsm font-semibold leading-[normal]',
  'bg-cadetGray-30/[.12] text-cadetGray-10 enabled:hover:bg-cadetGray-30/[.2]',
  'dark:bg-white-0/[.08] dark:text-gray-90 dark:enabled:hover:bg-white-0/[.14]',
  'disabled:cursor-default disabled:opacity-50',
  'motion-safe:transition-[background-color] motion-safe:duration-base',
].join(' ');

const UPLOAD_ICON_PATH = [
  'M12 3.5c.3 0 .5.1.7.3l4 4a.9.9 0 1 1-1.3 1.3l-2.5-2.5V15a.9.9 0 1 1-1.8 0V6.6L8.6 9.1a.9.9',
  ' 0 1 1-1.3-1.3l4-4c.2-.2.4-.3.7-.3ZM4.9 14.1c.5 0 .9.4.9.9v2.6c0 .9.7 1.6 1.6 1.6h9.2c.9 0',
  ' 1.6-.7 1.6-1.6V15a.9.9 0 1 1 1.8 0v2.6c0 1.9-1.5 3.4-3.4 3.4H7.4A3.4 3.4 0 0 1 4 17.6V15c0-.5.4-.9.9-.9Z',
].join('');

/**
 * Зона загрузки файла выгрузки: перетаскивание принимает вся зона, диалог открывает кнопка. Имя выбранного файла
 * показывает карточка под зоной, поэтому зона после выбора та же, только кнопка — «Заменить файл».
 *
 * Нативное поле файла скрыто: его кнопка и «Файл не выбран» — на языке браузера и попали бы в дерево доступности.
 * Диалог показывает только `.amostickers` и `.zip` — файл выгрузки, пересжатый архиватором, остаётся zip.
 */
export const FileDropZone: FC<FileDropZoneProps> = (props) => {
  const { hasFile, isDisabled, onPick } = props;
  const { setHold } = usePicker();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Диалог выбора уводит курсор из окна: без удержания попап закрылся бы, пока пользователь выбирает файл. Диалог
   * закрывается `change` (выбран новый файл) или `cancel` (отказ или тот же файл).
   */
  const handleChooseClick = () => {
    setHold('fileDialog', true);
    inputRef.current?.click();
  };

  const handleFileCancel = () => {
    setHold('fileDialog', false);
  };

  /**
   * Значение поля сбрасывается: повторный выбор того же файла — после правки библиотеки или ошибки — тоже `change`.
   */
  const handleFileChange = (event: TargetedEvent<HTMLInputElement>) => {
    const { currentTarget } = event;
    const file = currentTarget.files?.[0];

    setHold('fileDialog', false);
    currentTarget.value = '';
    onPick(file);
  };

  /**
   * Без `preventDefault` на `dragover` браузер не примет `drop` и откроет файл сам.
   */
  const handleZoneDragOver = (event: TargetedDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDisabled) setIsDragOver(true);
  };

  /**
   * Переход курсора на текст или кнопку внутри зоны — тоже `dragleave`: такой уход подсветку не снимает, иначе
   * рамка мигала бы над каждым дочерним узлом.
   */
  const handleZoneDragLeave = (event: TargetedDragEvent<HTMLDivElement>) => {
    const { currentTarget, relatedTarget } = event;

    if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;

    setIsDragOver(false);
  };

  /**
   * amo слушает `drop` на `body` и прикрепит файл к сообщению — не пускаем, в том числе во время импорта, когда
   * файл не принимается.
   */
  const handleZoneDrop = (event: TargetedDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    if (!isDisabled) onPick(event.dataTransfer?.files[0]);
  };

  return (
    <div
      className={zoneVariants({ isDragOver })}
      onDragOver={handleZoneDragOver}
      onDragLeave={handleZoneDragLeave}
      onDrop={handleZoneDrop}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5 shrink-0 fill-current"
      >
        <path d={UPLOAD_ICON_PATH} />
      </svg>

      <p className="m-0 leading-[1.4]">{t('add.file.dropHint')}</p>

      <button
        type="button"
        disabled={isDisabled}
        className={CHOOSE_BUTTON_CLASS}
        onClick={handleChooseClick}
      >
        {t(hasFile ? 'add.file.replaceFile' : 'add.file.chooseFile')}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".amostickers,.zip"
        hidden
        onChange={handleFileChange}
        onCancel={handleFileCancel}
      />
    </div>
  );
};
