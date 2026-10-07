import type { FunctionComponent as FC } from 'preact';

import type { MessageKey } from '../../../../../i18n/i18n.types';
import { t } from '../../../../../i18n/translate';
import { Button } from '../../../Button/Button';
import type {
  DraftSize,
  SaveBlock,
} from '../../../useStickerDraft/useStickerDraft.types';
import { segmentFormId } from '../../segmentIds/segmentIds';

import type { CreateStickerFooterProps } from './CreateStickerFooter.types';

const REASON_KEYS: Record<NonNullable<SaveBlock>, MessageKey> = {
  noFile: 'add.custom.noFile',
  converting: 'add.custom.building',
};

/**
 * Текст слота: причина недоступности важнее размера — во время пересборки размер от прежней
 * картинки ввёл бы в заблуждение.
 *
 * @param saveBlock — причина недоступности сохранения
 * @param size — размер готового стикера
 * @returns текст слота; пустая строка — писать нечего
 */
const noteText = (saveBlock: SaveBlock, size: DraftSize | null) => {
  if (saveBlock) return t(REASON_KEYS[saveBlock]);
  if (!size) return '';

  return t('add.custom.size', { width: size.width, height: size.height, size: size.kb });
};

/**
 * Слот слева от кнопки — по левому краю и до двух строк: кнопка сохранения длинная, и фраза в
 * одну строку рядом с ней не помещается; третья строка обрезается многоточием. Слот
 * объявляется скринридеру: размер и причина меняются без участия пользователя.
 */
const NOTE_CLASS =
  'line-clamp-2 min-w-0 flex-1 text-xs leading-tight text-cadetGray-30 dark:text-gray-70';

/**
 * Футер экрана на сегменте «Свой стикер»: «Сохранить в «Мои стикеры»» отправляет форму
 * сегмента, а слева сказано, почему кнопка недоступна, или, когда стикер готов, — его размер
 * и вес: сохранённый стикер уйдёт ровно таким.
 */
export const CreateStickerFooter: FC<CreateStickerFooterProps> = (props) => {
  const { isDisabled, saveBlock, size } = props;
  const note = noteText(saveBlock, size);

  return (
    <>
      <span aria-live="polite" className={NOTE_CLASS}>
        {note}
      </span>

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
