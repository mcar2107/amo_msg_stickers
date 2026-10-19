import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { listPacks, touchPack } from '@core/db';
import type { Pack, SendItem } from '@core/db.types';
import { DEFAULT_SETTINGS } from '@core/host';
import type { Settings } from '@core/host.types';
import { t } from '@core/i18n';
import { orderPacks, packSnapshot } from '@core/packOrder';
import { useObjectUrls } from '@ui/useObjectUrls';
import { usePickerViewState } from '@ui/usePickerView';

import { errorMessage } from './errorMessage';
import type {
  ImportSource,
  PickerStateOptions,
  PickerStateValue,
  PickerStatus,
  RefreshPacksOptions,
} from './PickerProvider.types';
import { useFavorites } from './useFavorites';
import { useFileImport } from './useFileImport';
import { useLibraryExport } from './useLibraryExport';
import { usePackImport } from './usePackImport';

/**
 * Состояние `PickerProvider`. Методы стабильны между рендерами: потребители кладут их в
 * зависимости эффектов, не рискуя перезапуском на каждый рендер.
 *
 * @param options — окружение и колбэки фасада
 * @returns значения обоих контекстов провайдера
 */
export const usePickerState = (options: PickerStateOptions): PickerStateValue => {
  const { env, onSend, onClose, isOpen, openedBy, holds } = options;
  const { set: setHold } = holds;
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [status, setStatus] = useState<PickerStatus | null>(null);
  const { urlOf, dropUrl } = useObjectUrls(isOpen);

  const settingsQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  /**
   * Чтение и запись настроек идут одной очередью: перечитывание на открытие попапа, начатое
   * во время записи, иначе прочитало бы хранилище до неё и вернуло бы в форму старые значения,
   * а запись, начатая во время чтения, была бы затёрта его результатом.
   */
  const enqueueSettings = useCallback(<T>(task: () => Promise<T>): Promise<T> => {
    const run = settingsQueueRef.current.then(task, task);

    settingsQueueRef.current = run.catch(() => {});

    return run;
  }, []);

  const refreshSettings = useCallback(async () => {
    const next = await enqueueSettings(() => {
      return env.getSettings();
    });

    setSettings(next);
  }, [env, enqueueSettings]);

  /**
   * Показанный порядок паков Telegram — в `ref`, а не в состоянии: рендеру он не нужен. `null` — порядок ещё не
   * показывался.
   */
  const packOrderRef = useRef<string[] | null>(null);

  /**
   * Снимок обновляется и без пересчёта: новый пак, вставший первым, остаётся на своём месте до следующего открытия,
   * даже если другая вкладка отметит использование другого нового пака.
   */
  const refreshPacks = useCallback(async ({ isReorder }: RefreshPacksOptions = {}) => {
    const ordered = orderPacks(
      await listPacks(),
      isReorder ? null : packOrderRef.current
    );

    packOrderRef.current = packSnapshot(ordered);
    setPacks(ordered);

    return ordered;
  }, []);

  const [recentRevision, setRecentRevision] = useState(0);

  const refreshRecent = useCallback(() => {
    setRecentRevision((revision) => {
      return revision + 1;
    });
  }, []);

  const showStatus = useCallback((text: string) => {
    setStatus({ text, isError: false });
  }, []);

  const showError = useCallback((text: string) => {
    setStatus({ text, isError: true });
  }, []);

  const saveSettings = useCallback(
    (next: Partial<Settings>) => {
      return enqueueSettings(async () => {
        try {
          await env.setSettings(next);
          setSettings((prev) => {
            return { ...prev, ...next };
          });

          return true;
        } catch (error) {
          showError(errorMessage(error));

          return false;
        }
      });
    },
    [env, enqueueSettings, showError]
  );

  const clearStatus = useCallback(() => {
    setStatus(null);
  }, []);

  const send = useCallback(
    async (item: SendItem, packId?: string) => {
      showStatus(t('status.sending'));

      try {
        await onSend(item);
        clearStatus();
        onClose();
      } catch (error) {
        showError(errorMessage(error) || t('status.sendFailed'));

        return;
      }

      if (!packId) return;

      /**
       * Сбой отметки — только в консоль: стикер уже отправлен, и ошибка порядка паков поверх
       * «отправлено» сбила бы с толку.
       */
      try {
        await touchPack(packId);
      } catch (error) {
        console.warn('[amo-stickers] pack usage mark failed', packId, error);
      }
    },
    [onSend, onClose, showStatus, showError, clearStatus]
  );

  const favorites = useFavorites({ showStatus, showError });
  const { refreshFavorites } = favorites;
  const view = usePickerViewState(isOpen, clearStatus);
  const { screen, addSegment, scrollToSection } = view;
  const importLock = useRef<ImportSource | null>(null);

  const packImport = usePackImport({
    env,
    settings,
    screen,
    addSegment,
    packs,
    importLock,
    refreshPacks,
    showStatus,
    showError,
    clearStatus,
    scrollToSection,
  });
  const { isImporting: isPackImporting } = packImport;

  const fileImport = useFileImport({
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
  });
  const { isImporting: isFileImporting } = fileImport;

  /**
   * Одна причина на оба импорта: из Telegram и из файла одновременно они не идут.
   */
  useEffect(() => {
    setHold('import', isPackImporting || isFileImporting);
  }, [isPackImporting, isFileImporting, setHold]);

  const libraryExport = useLibraryExport({ showStatus, showError });
  const { isExporting } = libraryExport;

  /**
   * Выгрузка удерживает попап до скачивания: открытый наведением попап, из которого ушёл курсор, иначе закрылся бы
   * посреди сборки файла, и ход выгрузки пропал бы из виду.
   */
  useEffect(() => {
    setHold('export', isExporting);
  }, [isExporting, setHold]);

  /**
   * Открытый экран удерживает попап: на «Добавить стикеры» и «Настройках» заполняют форму, и
   * случайный уход курсора за край попапа не должен прятать её. Закрыть такой попап можно
   * кликом вне него, Escape, кнопкой стикеров или «Назад» — после «Назад» уход курсора снова
   * закрывает попап.
   */
  useEffect(() => {
    setHold('screen', Boolean(screen));
  }, [screen, setHold]);

  return {
    picker: {
      env,
      settings,
      refreshSettings,
      saveSettings,
      packs,
      refreshPacks,
      recentRevision,
      status,
      showStatus,
      showError,
      clearStatus,
      send,
      urlOf,
      dropUrl,
      packImport,
      fileImport,
      libraryExport,
      openedBy,
      setHold,
    },
    view,
    favorites,
  };
};
