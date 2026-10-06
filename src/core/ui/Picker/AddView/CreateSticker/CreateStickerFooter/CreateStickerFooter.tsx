import type { FunctionComponent as FC } from 'preact';

import type { MessageKey } from '../../../../../i18n/i18n.types';
import { t } from '../../../../../i18n/translate';
import { Button } from '../../../Button/Button';
import type { SaveBlock } from '../../../useStickerDraft/useStickerDraft.types';
import { segmentFormId } from '../../segmentIds/segmentIds';

import type { CreateStickerFooterProps } from './CreateStickerFooter.types';

const REASON_KEYS: Record<NonNullable<SaveBlock>, MessageKey> = {
  noFile: 'add.custom.noFile',
  converting: 'add.custom.building',
};

/**
 * Футер экрана на сегменте «Свой стикер»: «Сохранить в «Мои стикеры»» отправляет форму
 * сегмента, а слева от недоступной кнопки сказано почему — иначе неясно, чего она ждёт.
 */
export const CreateStickerFooter: FC<CreateStickerFooterProps> = (props) => {
  const { isDisabled, saveBlock } = props;

  return (
    <>
      {saveBlock && (
        <span className="min-w-0 truncate text-xs text-cadetGray-30 dark:text-gray-70">
          {t(REASON_KEYS[saveBlock])}
        </span>
      )}

      <Button
        variant="primary"
        type="submit"
        form={segmentFormId('custom')}
        isDisabled={isDisabled}
      >
        {t('add.custom.save')}
      </Button>
    </>
  );
};
