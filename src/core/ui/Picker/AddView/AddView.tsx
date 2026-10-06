import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../i18n/translate';
import { Screen } from '../Screen/Screen';
import { usePickerView } from '../usePickerView/usePickerView';
import { useStickerDraft } from '../useStickerDraft/useStickerDraft';
import { useTelegramImport } from '../useTelegramImport/useTelegramImport';

import { CreateSticker } from './CreateSticker/CreateSticker';
import { CreateStickerFooter } from './CreateSticker/CreateStickerFooter/CreateStickerFooter';
import { SegmentForm } from './SegmentForm/SegmentForm';
import { SegmentTab } from './SegmentTab/SegmentTab';
import { TelegramImport } from './TelegramImport/TelegramImport';
import { TelegramImportFooter } from './TelegramImport/TelegramImportFooter/TelegramImportFooter';

/**
 * Добавление стикеров: сегменты «Telegram» (импорт пака) и «Свой стикер» (из файла).
 *
 * Хуки обеих форм вызываются здесь, а не в панелях: главная кнопка футера зависит от
 * выбранного сегмента и состояния его формы. Панели смонтированы обе, поэтому введённая
 * ссылка и черновик стикера переживают смену сегмента. Закрытие экрана сбрасывает черновик, а
 * ссылку и ошибку её поля держит провайдер — до успешного импорта.
 */
export const AddView: FC = () => {
  const { addSegment } = usePickerView();
  const { link, hasLink, fieldError, changeLink, isImporting, percent, startImport } =
    useTelegramImport();
  const {
    fileName,
    caption,
    previewUrl,
    isSavable,
    isConverting,
    saveBlock,
    pickFile,
    changeCaption,
    save,
  } = useStickerDraft();
  const isImportDisabled = isImporting || !hasLink;

  const handleTelegramSubmit = () => {
    if (!isImportDisabled) void startImport();
  };

  const handleLinkChange = (value: string) => {
    changeLink(value);
  };

  const handleCustomSubmit = () => {
    void save();
  };

  const handleFilePick = (file: File | undefined) => {
    pickFile(file);
  };

  const handleCaptionChange = (value: string) => {
    changeCaption(value);
  };

  const renderFooter = () => {
    switch (addSegment) {
      case 'telegram': {
        return <TelegramImportFooter isDisabled={isImportDisabled} />;
      }

      case 'custom': {
        return <CreateStickerFooter isDisabled={!isSavable} saveBlock={saveBlock} />;
      }

      default: {
        const unknownSegment: never = addSegment;

        throw new Error(`Unknown add segment: ${String(unknownSegment)}`);
      }
    }
  };

  return (
    <Screen title={t('add.title')} footer={renderFooter()}>
      <div
        role="tablist"
        aria-label={t('add.segments')}
        className="mb-2 flex items-center gap-0.5"
      >
        <SegmentTab segment="telegram" title={t('add.segment.telegram')} />

        <SegmentTab segment="custom" title={t('add.segment.custom')} />
      </div>

      <SegmentForm
        segment="telegram"
        isActive={addSegment === 'telegram'}
        onSubmit={handleTelegramSubmit}
      >
        <TelegramImport
          link={link}
          fieldError={fieldError}
          percent={percent}
          isActive={addSegment === 'telegram'}
          onLinkChange={handleLinkChange}
        />
      </SegmentForm>

      <SegmentForm
        segment="custom"
        isActive={addSegment === 'custom'}
        onSubmit={handleCustomSubmit}
      >
        <CreateSticker
          fileName={fileName}
          caption={caption}
          previewUrl={previewUrl}
          isConverting={isConverting}
          onPick={handleFilePick}
          onCaptionChange={handleCaptionChange}
        />
      </SegmentForm>
    </Screen>
  );
};
