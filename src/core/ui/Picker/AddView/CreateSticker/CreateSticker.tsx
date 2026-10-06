import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';
import { Field } from '../../Field/Field';

import { DropZone } from './DropZone/DropZone';
import { StickerPreview } from './StickerPreview/StickerPreview';
import type { CreateStickerProps } from './CreateSticker.types';

const CAPTION_FIELD_ID = 'picker-add-custom-caption';

/**
 * Панель сегмента «Свой стикер»: зона загрузки, подпись и превью. Фрагмент, а не обёртка:
 * строки ложатся в форму сегмента с её отступами. Черновик держит `AddView` — сохранение
 * стоит в футере экрана, вне панели, и черновик переживает смену сегмента.
 *
 * Превью показано и до первой картинки, пока стикер собирается: на его месте стоит
 * индикатор сборки.
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
      <h3 className="mt-1.5 text-xsm font-bold">{t('add.custom.title')}</h3>

      <DropZone fileName={fileName} onPick={handleZonePick} />

      <Field
        id={CAPTION_FIELD_ID}
        label={t('add.custom.caption')}
        value={caption}
        onInput={handleCaptionInput}
      />

      {(previewUrl || isConverting) && (
        <StickerPreview url={previewUrl} isBusy={isConverting} />
      )}
    </>
  );
};
