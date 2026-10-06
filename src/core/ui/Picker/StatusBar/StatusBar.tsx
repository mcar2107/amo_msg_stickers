import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC } from 'preact';

import { usePicker } from '../PickerProvider/usePicker';
import { SCREEN_FOOTER_HEIGHT_PX } from '../Screen/screenFooter';

import { useHeightReport } from './useHeightReport/useHeightReport';
import type { StatusBarProps } from './StatusBar.types';

const statusVariants = cva(
  [
    'border-t border-cadetGray-30/[.28] px-2.5 py-1.5 text-xs dark:border-white-0/10',
    'bg-white-0 dark:bg-gray-10',
    'motion-safe:transition-opacity motion-safe:duration-base [@starting-style]:opacity-0',
  ],
  {
    variants: {
      isError: {
        true: 'text-red-30',
        false: 'text-cadetGray-30 dark:text-gray-70',
      },
    },
  }
);

const RAISED_STYLE = { bottom: SCREEN_FOOTER_HEIGHT_PX };

const BASE_STYLE = { bottom: 0 };

/**
 * Строка статуса — слой поверх низа ленты над футером: лента не меняет высоту, и
 * прокрученные стикеры не сдвигаются, когда статус появляется или пропадает. `z-20` —
 * над экраном: прогресс импорта виден и на экране «Добавить стикеры».
 *
 * При открытом экране (`isRaised`) строка поднимается на высоту футера экрана и не
 * перекрывает его кнопки. Live region при этом остаётся тем же узлом, а не переезжает в
 * экран: область, появившаяся вместе с текстом, не объявляется.
 *
 * Live region — обёртка без отступов: она смонтирована и видна всегда, а без статуса пуста
 * и не занимает высоты. Скринридер объявляет изменение содержимого существующей области,
 * а область, появившуюся вместе с текстом или из `display: none`, обычно пропускает.
 * Строка с рамкой рендерится только со статусом: пустая перекрывала бы низ ленты.
 *
 * Высоту строки панель получает через `onHeightChange`: тело открытого экрана отступает на неё
 * снизу, и строка не прячет конец его содержимого.
 *
 * Строка появляется переходом из `@starting-style` при монтировании; переход и длительность —
 * под `motion-safe:`, как у панели режима. Смена текста в уже показанной строке не мигает.
 */
export const StatusBar: FC<StatusBarProps> = (props) => {
  const { isRaised, onHeightChange } = props;
  const { status } = usePicker();
  const regionRef = useHeightReport(onHeightChange);

  return (
    <div
      ref={regionRef}
      role="status"
      className="absolute inset-x-0 z-20"
      style={isRaised ? RAISED_STYLE : BASE_STYLE}
    >
      {status && (
        <div className={statusVariants({ isError: status.isError })}>{status.text}</div>
      )}
    </div>
  );
};
