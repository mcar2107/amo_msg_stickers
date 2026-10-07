import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';
import { Field } from '../../Field/Field';

import { DraftPreview } from './DraftPreview/DraftPreview';
import { DropZone } from './DropZone/DropZone';
import type { CreateStickerProps } from './CreateSticker.types';

const CAPTION_FIELD_ID = 'picker-add-custom-caption';

/**
 * Панель сегмента «Свой стикер»: зона загрузки с превью и подпись. Фрагмент, а не обёртка:
 * строки ложатся в форму сегмента с её отступами. Черновик держит `AddView` — сохранение
 * стоит в футере экрана, вне панели, и черновик переживает смену сегмента.
 *
 * Своего заголовка у панели нет: её называет вкладка сегмента, а лишняя строка не дала бы
 * сегменту поместиться в панель без прокрутки.
 */
export const CreateSticker: FC<CreateStickerProps> = (props) => {
  const { fileName, caption, previewUrl, isConverting, onPick, onCaptionChange } = props;

  const handleZonePick = (file: File | undefined) => {
    onPick(file);
  };

  const handleCaptionInput = (value: string) => {
    onCaptionChange(value);
  };

  return (
    <>
      <DropZone
        fileName={fileName}
        preview={
          <DraftPreview url={previewUrl} caption={caption.trim()} isBusy={isConverting} />
        }
        onPick={handleZonePick}
      />

      <Field
        id={CAPTION_FIELD_ID}
        label={t('add.custom.caption')}
        value={caption}
        placeholder={t('add.custom.captionPlaceholder')}
        onInput={handleCaptionInput}
      />
    </>
  );
};
