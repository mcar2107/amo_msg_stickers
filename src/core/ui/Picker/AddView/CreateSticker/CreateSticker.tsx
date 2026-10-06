import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';
import { TextInput } from '../../TextInput/TextInput';

import { DropZone } from './DropZone/DropZone';
import { StickerPreview } from './StickerPreview/StickerPreview';
import type { CreateStickerProps } from './CreateSticker.types';

/**
 * Панель сегмента «Свой стикер»: зона загрузки, подпись и превью. Фрагмент, а не обёртка:
 * строки ложатся в форму сегмента с её отступами. Черновик держит `AddView` — сохранение
 * стоит в футере экрана, вне панели, и черновик переживает смену сегмента.
 */
export const CreateSticker: FC<CreateStickerProps> = (props) => {
  const { fileName, caption, previewUrl, onPick, onCaptionChange } = props;

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

      <TextInput
        type="text"
        value={caption}
        placeholder={t('add.custom.caption')}
        onInput={handleCaptionInput}
      />

      {previewUrl && <StickerPreview url={previewUrl} />}
    </>
  );
};
