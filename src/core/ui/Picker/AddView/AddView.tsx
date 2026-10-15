import type { FunctionComponent as FC } from 'preact';

import type { MessageKey } from '../../../i18n/i18n.types';
import { t } from '../../../i18n/translate';
import { usePicker } from '../PickerProvider/usePicker';
import { Screen } from '../Screen/Screen';
import { ADD_SEGMENTS } from '../usePickerView/addSegment';
import { usePickerView } from '../usePickerView/usePickerView';
import type { AddSegment } from '../usePickerView/usePickerView.types';
import { useStickerDraft } from '../useStickerDraft/useStickerDraft';
import { useTelegramImport } from '../useTelegramImport/useTelegramImport';

import { CreateSticker } from './CreateSticker/CreateSticker';
import { CreateStickerFooter } from './CreateSticker/CreateStickerFooter/CreateStickerFooter';
import { SegmentForm } from './SegmentForm/SegmentForm';
import { SegmentTab } from './SegmentTab/SegmentTab';
import { TelegramImport } from './TelegramImport/TelegramImport';
import { TelegramImportFooter } from './TelegramImport/TelegramImportFooter/TelegramImportFooter';

/**
 * Подписи вкладок сегментов.
 */
const SEGMENT_TITLES: Record<AddSegment, MessageKey> = {
  telegram: 'add.segment.telegram',
  custom: 'add.segment.custom',
  file: 'add.segment.file',
};

/**
 * Добавление стикеров: сегменты «Telegram» (импорт пака), «Свой стикер» (из картинки или видео) и «Файл» (перенос
 * библиотеки).
 *
 * Хуки форм вызываются здесь, а не в панелях: главная кнопка футера зависит от выбранного сегмента и состояния его
 * формы. Панели смонтированы все, поэтому введённая ссылка и черновик стикера переживают смену сегмента. Закрытие
 * экрана сбрасывает черновик, а ссылку, ошибку её поля и выбранный файл держит провайдер — до успешного импорта.
 */
export const AddView: FC = () => {
  const { addSegment } = usePickerView();
  const { fileImport } = usePicker();
  const {
    link,
    hasLink,
    fieldError,
    isPackMissing,
    card,
    changeLink,
    isImporting,
    isBlocked,
    startImport,
    cancelImport,
  } = useTelegramImport();
  const {
    fileName,
    caption,
    previewUrl,
    size,
    isSavable,
    isConverting,
    saveBlock,
    pickFile,
    changeCaption,
    save,
  } = useStickerDraft();
  const isImportDisabled = isImporting || isBlocked || !hasLink || isPackMissing;

  /**
   * Enter в поле во время импорта отправляет форму и без кнопки отправки в футере — у формы с
   * одним полем неявная отправка идёт и так; импорт он не отменяет и второй не запускает.
   */
  const handleTelegramSubmit = () => {
    if (!isImportDisabled) void startImport();
  };

  const handleImportCancel = () => {
    cancelImport();
  };

  const handleLinkChange = (value: string) => {
    changeLink(value);
  };

  const handleCustomSubmit = () => {
    void save();
  };

  const handleFileSubmit = () => {
    if (!fileImport.isImportDisabled) void fileImport.importFile();
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
        return (
          <TelegramImportFooter
            isImporting={isImporting}
            isDisabled={isImportDisabled}
            onCancel={handleImportCancel}
          />
        );
      }

      case 'custom': {
        return (
          <CreateStickerFooter
            isDisabled={!isSavable}
            saveBlock={saveBlock}
            size={size}
          />
        );
      }

      case 'file': {
        return null;
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
        {ADD_SEGMENTS.map((segment) => {
          return (
            <SegmentTab
              key={segment}
              segment={segment}
              title={t(SEGMENT_TITLES[segment])}
            />
          );
        })}
      </div>

      <SegmentForm
        segment="telegram"
        isActive={addSegment === 'telegram'}
        onSubmit={handleTelegramSubmit}
      >
        <TelegramImport
          link={link}
          fieldError={fieldError}
          card={card}
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

      <SegmentForm
        segment="file"
        isActive={addSegment === 'file'}
        onSubmit={handleFileSubmit}
      >
        {null}
      </SegmentForm>
    </Screen>
  );
};
