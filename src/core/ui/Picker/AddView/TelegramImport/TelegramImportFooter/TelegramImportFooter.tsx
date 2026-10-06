import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../../i18n/translate';
import { Button } from '../../../Button/Button';
import { segmentFormId } from '../../segmentIds/segmentIds';

import type { TelegramImportFooterProps } from './TelegramImportFooter.types';

/**
 * Футер экрана на сегменте «Telegram»: «Импорт» отправляет форму сегмента.
 */
export const TelegramImportFooter: FC<TelegramImportFooterProps> = (props) => {
  const { isDisabled } = props;

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
