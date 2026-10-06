import { useCallback, useEffect, useState } from 'preact/hooks';

import { captionDecorator, detectKind, toStickerGif } from '../../../convert';
import { CUSTOM_PACK_ID, putSticker, uid } from '../../../db';
import { t } from '../../../i18n/translate';
import { errorMessage } from '../PickerProvider/errorMessage';
import { usePicker } from '../PickerProvider/usePicker';
import { usePickerView } from '../usePickerView/usePickerView';

import { isDraftConverting } from './draftConverting';
import { saveBlock } from './saveBlock';
import type { StickerDraft, StickerDraftState } from './useStickerDraft.types';

const CAPTION_DEBOUNCE_MS = 500;
const BYTES_IN_KB = 1024;

/**
 * Черновик своего стикера: исходный файл, подпись и собранный из них GIF с превью.
 *
 * Пока идёт пересборка, на экране остаётся прежнее превью, а сохранение недоступно — в том
 * числе в задержке ввода подписи, до запуска пересборки. Пока стикер сохраняется, повторное
 * сохранение тоже недоступно: иначе двойной клик записал бы два одинаковых стикера.
 * Результат пересборки, которую обогнала следующая (новый файл, новая подпись) или
 * размонтирование формы, отбрасывается, и URL для него не создаётся. При ошибке
 * конвертации превью убирается: сохранять нечего.
 *
 * Object URL превью отзывается, как только черновик заменён, сброшен ошибкой или форма
 * размонтирована, — блоб прежнего GIF в памяти не остаётся.
 *
 * @returns черновик, состояние сборки, выбор файла, смена подписи и сохранение
 */
export const useStickerDraft = (): StickerDraftState => {
  const { refreshPacks, showStatus, showError, setHold } = usePicker();
  const { scrollToSection } = usePickerView();
  const [source, setSource] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [draft, setDraft] = useState<StickerDraft | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isConverting = isDraftConverting({
    hasFile: !!source,
    caption,
    drawnCaption: captionText,
    isEncoding,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setCaptionText(caption.trim());
    }, CAPTION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [caption]);

  /**
   * Идущая конвертация удерживает попап: закрытый уходом курсора пикер спрятал бы её
   * результат. Форма размонтирована — результат отбрасывается, и удержание снимается.
   */
  useEffect(() => {
    setHold('conversion', isEncoding);

    return () => {
      setHold('conversion', false);
    };
  }, [isEncoding, setHold]);

  useEffect(() => {
    if (!source) return;
    let isStale = false;

    const convert = async () => {
      setIsEncoding(true);
      showStatus(t('status.converting'));

      try {
        const gif = await toStickerGif(source, detectKind(source, source.name), {
          decorate: captionText ? captionDecorator(captionText) : undefined,
        });

        if (isStale) return;
        const { blob, width, height } = gif;

        setDraft({ gif, caption: captionText, url: URL.createObjectURL(blob) });
        showStatus(
          t('status.stickerSize', {
            width,
            height,
            size: Math.round(blob.size / BYTES_IN_KB),
          })
        );
      } catch (error) {
        if (isStale) return;
        setDraft(null);
        showError(t('status.convertFailed', { message: errorMessage(error) }));
      } finally {
        if (!isStale) setIsEncoding(false);
      }
    };

    void convert();

    return () => {
      isStale = true;
    };
  }, [source, captionText, showStatus, showError]);

  useEffect(() => {
    if (!draft) return;
    const { url } = draft;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [draft]);

  const pickFile = useCallback((file: File | undefined) => {
    if (file) setSource(file);
  }, []);

  const changeCaption = useCallback((nextCaption: string) => {
    setCaption(nextCaption);
  }, []);

  const save = useCallback(async () => {
    if (!draft || isConverting || isSaving) return;
    const {
      gif: { blob, width, height },
      caption: drawnCaption,
    } = draft;

    setIsSaving(true);

    try {
      await putSticker({
        id: uid(),
        packId: CUSTOM_PACK_ID,
        blob,
        width,
        height,
        caption: drawnCaption || undefined,
        createdAt: Date.now(),
      });
      await refreshPacks();
      scrollToSection(CUSTOM_PACK_ID, 'instant');
    } catch (error) {
      showError(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [draft, isConverting, isSaving, refreshPacks, scrollToSection, showError]);

  return {
    fileName: source?.name || null,
    caption,
    previewUrl: draft?.url || null,
    isSavable: !!draft && !isConverting && !isSaving,
    isConverting,
    saveBlock: saveBlock({ hasFile: !!source, isConverting }),
    pickFile,
    changeCaption,
    save,
  };
};
