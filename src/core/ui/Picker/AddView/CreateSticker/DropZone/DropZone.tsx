import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC, TargetedDragEvent, TargetedEvent } from 'preact';
import { useRef, useState } from 'preact/hooks';

import { t } from '../../../../../i18n/translate';
import { usePicker } from '../../../PickerProvider/usePicker';

import type { DropZoneProps } from './DropZone.types';

/**
 * Цвета обычной и подсвеченной зоны — взаимоисключающие наборы: конфликтующих утилит
 * на одном элементе быть не должно (`tailwind-merge` не берём).
 *
 * Длительность — под `motion-safe:`, как и переход: длительность по умолчанию из
 * `motion-safe:transition-*` перебила бы простую `duration-base`.
 */
const zoneVariants = cva(
  [
    'flex h-31 shrink-0 items-center rounded-lgx border-[1.5px] border-dashed text-xs',
    'motion-safe:transition-[color,background-color,border-color] motion-safe:duration-base',
  ].join(' '),
  {
    variants: {
      hasFile: {
        true: 'relative p-1.5',
        false: 'flex-col justify-center gap-1.5 p-3 text-center',
      },
      isDragOver: {
        true: 'border-blue-50 bg-blue-50/[.06] text-blue-50 dark:border-beige-70 dark:bg-beige-70/[.06] dark:text-beige-70',
        false:
          'border-cadetGray-30/[.28] text-cadetGray-30 dark:border-white-0/[.1] dark:text-gray-70',
      },
    },
  }
);

/**
 * Плашка поверх превью: непрозрачный фон и тень читаются на любой картинке, а не только на
 * шахматке.
 */
const OVERLAY_CLASS = [
  'absolute rounded-md bg-white-0/90 font-semibold text-cadetGray-10 shadow-[0_1px_3px] shadow-black-0/20',
  'dark:bg-gray-10/90 dark:text-gray-90',
].join(' ');

/**
 * Кнопка выбора — своя, а не основная `Button`: кольцо фокуса панели рисуется внутри
 * границы цветом акцента, и на акцентной заливке основной кнопки его не видно. Нейтральная
 * заливка оставляет кольцо заметным и не спорит с главной кнопкой футера.
 */
const chooseButtonVariants = cva(
  [
    'shrink-0 cursor-pointer rounded-lg font-primary font-semibold leading-[normal]',
    'motion-safe:transition-[background-color] motion-safe:duration-base',
  ].join(' '),
  {
    variants: {
      /**
       * Замена — второстепенное действие поверх превью: маленькая плашка в углу, картинка
       * главнее.
       */
      hasFile: {
        true: [
          OVERLAY_CLASS,
          'right-2.5 top-2.5 h-6 px-2 text-xs hover:bg-white-0 dark:hover:bg-gray-10',
        ].join(' '),
        false: [
          'h-8 px-3.5 text-xsm',
          'bg-cadetGray-30/[.12] text-cadetGray-10 hover:bg-cadetGray-30/[.2]',
          'dark:bg-white-0/[.08] dark:text-gray-90 dark:hover:bg-white-0/[.14]',
        ].join(' '),
      },
    },
  }
);

/**
 * Имя файла — плашкой в нижнем левом углу превью; правый край оставлен значку увеличения.
 */
const FILE_NAME_CLASS = [
  OVERLAY_CLASS,
  'pointer-events-none bottom-2.5 left-2.5 m-0 max-w-[calc(100%-3.5rem)] truncate px-1.5 py-0.5',
].join(' ');

const UPLOAD_ICON_PATH = [
  'M12 3.5c.3 0 .5.1.7.3l4 4a.9.9 0 1 1-1.3 1.3l-2.5-2.5V15a.9.9 0 1 1-1.8 0V6.6L8.6 9.1a.9.9',
  ' 0 1 1-1.3-1.3l4-4c.2-.2.4-.3.7-.3ZM4.9 14.1c.5 0 .9.4.9.9v2.6c0 .9.7 1.6 1.6 1.6h9.2c.9 0',
  ' 1.6-.7 1.6-1.6V15a.9.9 0 1 1 1.8 0v2.6c0 1.9-1.5 3.4-3.4 3.4H7.4A3.4 3.4 0 0 1 4 17.6V15c0-.5.4-.9.9-.9Z',
].join('');

/**
 * Зона загрузки: перетаскивание принимает вся зона, а диалог выбора открывает кнопка. Пока
 * файла нет — иконка, текст и «Выбрать файл»; после выбора превью (слот `preview`) занимает
 * всю зону, а имя файла и маленькая «Заменить файл» лежат поверх него в углах. Высота зоны одна в обоих видах: выбор файла не
 * сдвигает форму, и сегмент помещается в панель без прокрутки и тогда, когда тело отступает
 * под показанную строку статуса.
 *
 * Нативное поле файла скрыто: его кнопка и строка «Файл не выбран» — на языке браузера, а не
 * интерфейса, и попали бы в дерево доступности. Имя кнопки и текст зоны берутся из словаря,
 * поле открывается программным `click()` по нажатию кнопки — оно остаётся действием
 * пользователя, и браузер диалог пускает.
 */
export const DropZone: FC<DropZoneProps> = (props) => {
  const { fileName, preview, onPick } = props;
  const hasFile = Boolean(fileName);
  const { setHold } = usePicker();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Диалог выбора уводит курсор из окна: без удержания попап закрылся бы, пока
   * пользователь выбирает файл. Диалог закрывается `change` (выбран новый файл) или
   * `cancel` (отказ или тот же файл).
   */
  const handleChooseClick = () => {
    setHold('fileDialog', true);
    inputRef.current?.click();
  };

  const handleFileCancel = () => {
    setHold('fileDialog', false);
  };

  const handleFileChange = (event: TargetedEvent<HTMLInputElement>) => {
    setHold('fileDialog', false);
    onPick(event.currentTarget.files?.[0]);
  };

  /**
   * Без `preventDefault` на `dragover` браузер не примет `drop` и откроет файл сам.
   */
  const handleZoneDragOver = (event: TargetedDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  /**
   * Переход курсора на текст или кнопку внутри зоны — тоже `dragleave`: такой уход
   * подсветку не снимает, иначе рамка мигала бы над каждым дочерним узлом.
   */
  const handleZoneDragLeave = (event: TargetedDragEvent<HTMLDivElement>) => {
    const { currentTarget, relatedTarget } = event;

    if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;

    setIsDragOver(false);
  };

  /**
   * amo слушает `drop` на `body` и прикрепит файл к сообщению — не пускаем.
   */
  const handleZoneDrop = (event: TargetedDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    onPick(event.dataTransfer?.files[0]);
  };

  const chooseButton = (
    <button
      type="button"
      className={chooseButtonVariants({ hasFile })}
      onClick={handleChooseClick}
    >
      {t(hasFile ? 'add.custom.replaceFile' : 'add.custom.chooseFile')}
    </button>
  );

  return (
    <div
      className={zoneVariants({ hasFile, isDragOver })}
      onDragOver={handleZoneDragOver}
      onDragLeave={handleZoneDragLeave}
      onDrop={handleZoneDrop}
    >
      {fileName ? (
        <>
          {preview}

          <p className={FILE_NAME_CLASS}>{fileName}</p>

          {chooseButton}
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 shrink-0 fill-current"
          >
            <path d={UPLOAD_ICON_PATH} />
          </svg>

          <p className="m-0 leading-[1.4]">{t('add.custom.dropHint')}</p>

          {chooseButton}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.tgs"
        hidden
        onChange={handleFileChange}
        onCancel={handleFileCancel}
      />
    </div>
  );
};
