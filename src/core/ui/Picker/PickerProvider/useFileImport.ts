import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { listFavoriteKeys, listRecent, listStickerIds, writeImport } from '@core/db';
import { t } from '@core/i18n';
import type { FileCard, FileImportProgress, LibraryFile } from '@core/libraryFile';
import {
  hasFileCardAdds,
  loadFileCard,
  prepareImport,
  readLibraryFile,
} from '@core/libraryFile';

import { errorMessage } from './errorMessage';
import type { FileImportFailure } from './fileImportOutcome';
import {
  fileImportStatus,
  finishFileImport,
  isRecentSectionShown,
} from './fileImportOutcome';
import type { ImportErrorTarget } from './finishImport';
import { importErrorTarget } from './finishImport';
import type {
  FileImportOptions,
  FileImportStage,
  FileImportState,
} from './PickerProvider.types';
import { runFileImport } from './runFileImport';

/**
 * Покажет ли лента «Недавние» после записи — по базе, а не по ленте: лента перечитывается после импорта сама и к
 * моменту итога может быть ещё прежней. Сбой чтения — раздела нет: лента остаётся у паков.
 *
 * @returns true — раздел «Недавние» будет в ленте
 */
const isRecentShown = async () => {
  try {
    const [recent, stickerIds, favoriteKeys] = await Promise.all([
      listRecent('sticker'),
      listStickerIds(),
      listFavoriteKeys(),
    ]);

    return isRecentSectionShown(recent, stickerIds, favoriteKeys);
  } catch (error) {
    console.warn('[amo-stickers] recent read after file import failed', error);

    return false;
  }
};

/**
 * Импорт библиотеки из файла на уровне провайдера. Провайдер живёт всё время страницы, а сегмент «Файл»
 * размонтируется с экраном «Добавить стикеры»: выбранный файл, карточка и ход импорта переживают уход и возврат, и
 * второй импорт поверх идущего — из файла или из Telegram — не запускается.
 *
 * Карточка сверяется с библиотекой при выборе файла, при возврате на сегмент и по «Импорт»: библиотека меняется, пока
 * файл выбран. Ответ сверки, устаревший к своему приходу (выбран другой файл или начался импорт), отбрасывается.
 *
 * Ошибка импорта остаётся у зоны загрузки и тогда, когда пользователь ушёл с сегмента и увидел её в статусе: после
 * ошибки проверки «Импорт» недоступна, и вернувшийся видит у зоны, почему.
 *
 * @param options — вид, занятость импорта и методы провайдера
 * @returns файл, карточка, ход импорта, его запуск и отмена
 */
export const useFileImport = (options: FileImportOptions): FileImportState => {
  const {
    screen,
    addSegment,
    importLock,
    isPackImporting,
    refreshPacks,
    showStatus,
    showError,
    clearStatus,
    scrollToSection,
    refreshFavorites,
    refreshRecent,
  } = options;
  const [libraryFile, setLibraryFile] = useState<LibraryFile | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [card, setCard] = useState<FileCard | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFileRejected, setIsFileRejected] = useState(false);
  const [stage, setStage] = useState<FileImportStage | null>(null);
  const [progress, setProgress] = useState<FileImportProgress | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  /**
   * Номер сверки: растёт на выбор файла, возврат на сегмент и начало импорта — ответ прежней сверки уже не должен
   * менять карточку.
   */
  const requestRef = useRef(0);

  /**
   * Этап — и в `ref`: отмена и сверка при возврате на сегмент читают его до перерисовки.
   */
  const stageRef = useRef<FileImportStage | null>(null);

  /**
   * Ход — и в `ref`: строка статуса на уходе с сегмента показывает последний ход, не дожидаясь следующего.
   */
  const progressRef = useRef<FileImportProgress | null>(null);
  const libraryFileRef = useRef(libraryFile);

  libraryFileRef.current = libraryFile;

  /**
   * Экран и сегмент на момент хода и завершения, а не запуска: импорт идёт долго, и пользователь успевает уйти.
   */
  const screenRef = useRef(screen);
  const segmentRef = useRef(addSegment);

  screenRef.current = screen;
  segmentRef.current = addSegment;

  const isSegmentShown = screen === 'add' && addSegment === 'file';
  const isImporting = stage !== null;

  const changeStage = useCallback((next: FileImportStage | null) => {
    stageRef.current = next;
    setStage(next);
  }, []);

  const changeProgress = useCallback((next: FileImportProgress | null) => {
    progressRef.current = next;
    setProgress(next);
  }, []);

  /**
   * Строка статуса дублирует ход импорта, пока сегмент «Файл» не виден, — по каждому шагу хода и по уходу с сегмента и
   * возврату на него: запись хода не сообщает, и ушедший посреди записи без этого не узнал бы о ней.
   */
  const syncStatus = useCallback(
    (isFormShown: boolean) => {
      const current = stageRef.current;

      if (!current) return;
      const text = fileImportStatus(current, progressRef.current, isFormShown);

      if (text) {
        showStatus(text);
      } else {
        clearStatus();
      }
    },
    [showStatus, clearStatus]
  );

  useEffect(() => {
    syncStatus(isSegmentShown);
  }, [isSegmentShown, syncStatus]);

  const readFile = useCallback(async (file: File | undefined) => {
    if (!file || stageRef.current) return;
    requestRef.current += 1;
    const request = requestRef.current;

    setFileName(file.name);
    setLibraryFile(null);
    setCard(null);
    setError(null);
    setIsFileRejected(false);
    setIsReading(true);

    try {
      const read = await readLibraryFile(file);
      const nextCard = await loadFileCard(read);

      if (request !== requestRef.current) return;
      setLibraryFile(read);
      setCard(nextCard);
    } catch (readError) {
      if (request !== requestRef.current) return;
      setError(errorMessage(readError));
      setIsFileRejected(true);
    } finally {
      if (request === requestRef.current) setIsReading(false);
    }
  }, []);

  /**
   * Возврат на сегмент сверяет карточку заново: пак, удалённый за время ухода, снова покажется новым. Сбой сверки
   * оставляет прежнюю карточку — «Импорт» всё равно сверит библиотеку заново.
   */
  useEffect(() => {
    const shown = libraryFileRef.current;

    if (!isSegmentShown || !shown || stageRef.current) return;
    requestRef.current += 1;
    const request = requestRef.current;

    const refresh = async () => {
      try {
        const nextCard = await loadFileCard(shown);

        if (request === requestRef.current) setCard(nextCard);
      } catch (cardError) {
        console.warn('[amo-stickers] file card refresh failed', cardError);
      }
    };

    void refresh();
  }, [isSegmentShown]);

  const isImportDisabled =
    !libraryFile ||
    !card ||
    !hasFileCardAdds(card) ||
    isReading ||
    isFileRejected ||
    isImporting ||
    isPackImporting;

  const importFile = useCallback(async () => {
    if (!libraryFile || isImportDisabled || importLock.current) return;

    /**
     * Пока сегмент «Файл» на виду, ход показывает карточка, и строка статуса его не дублирует; ушедший видит ход
     * только в строке статуса.
     */
    const isFormShown = () => {
      return importErrorTarget(screenRef.current, segmentRef.current, 'file') === 'field';
    };

    const trackProgress = (next: FileImportProgress) => {
      changeProgress(next);
      syncStatus(isFormShown());
    };

    const showImportError = (failure: FileImportFailure, target: ImportErrorTarget) => {
      const { message, isRetryable } = failure;

      setError(message);
      if (!isRetryable) setIsFileRejected(true);

      switch (target) {
        case 'field': {
          /**
           * Ход импорта в строке статуса устарел, а ошибку видно у зоны.
           */
          clearStatus();

          return;
        }

        case 'status': {
          showError(t('status.fileImportFailed', { message }));

          return;
        }

        default: {
          const unknownTarget: never = target;

          throw new Error(`Unknown import error target: ${String(unknownTarget)}`);
        }
      }
    };

    const controller = new AbortController();

    controllerRef.current = controller;
    importLock.current = 'file';

    await runFileImport({
      libraryFile,
      signal: controller.signal,
      loadCard: loadFileCard,
      prepare: prepareImport,
      write: writeImport,
      refreshPacks,
      errorTarget: () => {
        return importErrorTarget(screenRef.current, segmentRef.current, 'file');
      },
      onStart: () => {
        requestRef.current += 1;
        changeStage('checking');
        changeProgress(null);
        setError(null);
      },
      onCard: setCard,
      onProgress: trackProgress,
      onWriting: () => {
        changeStage('writing');
        changeProgress(null);
        syncStatus(isFormShown());
      },
      onSuccess: (written, packs) => {
        setLibraryFile(null);
        setFileName(null);
        setCard(null);
        setError(null);
        void finishFileImport({
          screen: screenRef.current,
          packs,
          written,
          scrollToSection,
          showStatus,
          refreshFavorites,
          refreshRecent,
          isRecentShown,
        });
      },
      onError: showImportError,
      onCancel: () => {
        showStatus(t('status.importCanceled'));
      },
      onFinish: () => {
        controllerRef.current = null;
        importLock.current = null;
        changeStage(null);
        changeProgress(null);
      },
    });
  }, [
    libraryFile,
    isImportDisabled,
    importLock,
    refreshPacks,
    showStatus,
    showError,
    clearStatus,
    scrollToSection,
    refreshFavorites,
    refreshRecent,
    changeStage,
    changeProgress,
    syncStatus,
  ]);

  const cancelImport = useCallback(() => {
    if (stageRef.current === 'checking') controllerRef.current?.abort();
  }, []);

  /**
   * Наружу выбор файла — метод без промиса: чтение сообщает исход состоянием провайдера, и ждать его некому.
   */
  const pickFile = useCallback(
    (file: File | undefined) => {
      void readFile(file);
    },
    [readFile]
  );

  return useMemo(() => {
    return {
      fileName,
      card,
      isReading,
      error,
      stage,
      progress,
      isImporting,
      isImportDisabled,
      pickFile,
      importFile,
      cancelImport,
    };
  }, [
    fileName,
    card,
    isReading,
    error,
    stage,
    progress,
    isImporting,
    isImportDisabled,
    pickFile,
    importFile,
    cancelImport,
  ]);
};
