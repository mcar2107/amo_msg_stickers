import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';
import { Button } from '../../Button/Button';
import type { ButtonClickEvent } from '../../Button/Button.types';
import { segmentFormId } from '../segmentIds/segmentIds';

import { isRepeatClick } from './isRepeatClick/isRepeatClick';
import type { ImportFooterProps } from './ImportFooter.types';

/**
 * Футер экрана на сегментах импорта — «Telegram» и «Файл»: «Импорт» отправляет форму сегмента, во время импорта на
 * её месте — «Отменить».
 *
 * Обе кнопки — один `Button` в одной позиции без `key`: Preact обновляет узел на месте, и фокус
 * с «Импорт» остаётся на «Отменить» и возвращается обратно. «Отменить» — не кнопка отправки:
 * Enter в поле формы её не нажимает. Недоступная «Отменить» (этап, который не прерывается) фокус тоже держит.
 */
export const ImportFooter: FC<ImportFooterProps> = (props) => {
  const { segment, isImporting, isDisabled, isCancelDisabled, onCancel } = props;

  const handleCancelClick = (event: ButtonClickEvent) => {
    if (isRepeatClick(event.detail)) return;

    onCancel();
  };

  if (isImporting) {
    return (
      <Button
        variant="secondary"
        type="button"
        isDisabled={isCancelDisabled}
        shouldKeepFocus
        onClick={handleCancelClick}
      >
        {t('add.cancel')}
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      type="submit"
      form={segmentFormId(segment)}
      isDisabled={isDisabled}
    >
      {t('add.import')}
    </Button>
  );
};
