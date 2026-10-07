import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../../i18n/translate';
import { Button } from '../../../Button/Button';
import type { ButtonClickEvent } from '../../../Button/Button.types';
import { segmentFormId } from '../../segmentIds/segmentIds';

import { isRepeatClick } from './isRepeatClick/isRepeatClick';
import type { TelegramImportFooterProps } from './TelegramImportFooter.types';

/**
 * Футер экрана на сегменте «Telegram»: «Импорт» отправляет форму сегмента, во время импорта на
 * её месте — «Отменить».
 *
 * Обе кнопки — один `Button` в одной позиции без `key`: Preact обновляет узел на месте, и фокус
 * с «Импорт» остаётся на «Отменить» и возвращается обратно. «Отменить» — не кнопка отправки:
 * Enter в поле ссылки её не нажимает.
 */
export const TelegramImportFooter: FC<TelegramImportFooterProps> = (props) => {
  const { isImporting, isDisabled, onCancel } = props;

  const handleCancelClick = (event: ButtonClickEvent) => {
    if (isRepeatClick(event.detail)) return;

    onCancel();
  };

  if (isImporting) {
    return (
      <Button variant="secondary" type="button" onClick={handleCancelClick}>
        {t('add.telegram.cancel')}
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      type="submit"
      form={segmentFormId('telegram')}
      isDisabled={isDisabled}
    >
      {t('add.telegram.import')}
    </Button>
  );
};
