import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { listPacks, touchPack } from '../../../db';
import type { Pack, SendItem } from '../../../db.types';
import { DEFAULT_SETTINGS } from '../../../host';
import type { Settings } from '../../../host.types';
import { t } from '../../../i18n/translate';
import { orderPacks, packSnapshot } from '../../../packOrder';
import { useObjectUrls } from '../useObjectUrls/useObjectUrls';
import { usePickerViewState } from '../usePickerView/usePickerViewState';

import { errorMessage } from './errorMessage';
import type {
  PickerStateOptions,
  PickerStateValue,
  PickerStatus,
  RefreshPacksOptions,
} from './PickerProvider.types';
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

  const view = usePickerViewState(isOpen, clearStatus);
  const { screen, addSegment, scrollToSection } = view;

  const packImport = usePackImport({
    env,
    settings,
    screen,
    addSegment,
    packs,
    refreshPacks,
    showStatus,
    showError,
    clearStatus,
    scrollToSection,
  });
  const { isImporting } = packImport;

  useEffect(() => {
    setHold('import', isImporting);
  }, [isImporting, setHold]);

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
      status,
      showStatus,
      showError,
      clearStatus,
      send,
      urlOf,
      dropUrl,
      packImport,
      openedBy,
      setHold,
    },
    view,
  };
};
