import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { listPacks } from '../../../db';
import type { Pack, SendItem } from '../../../db.types';
import { DEFAULT_SETTINGS } from '../../../host';
import type { Settings } from '../../../host.types';
import { t } from '../../../i18n/translate';
import { useObjectUrls } from '../useObjectUrls/useObjectUrls';
import { usePickerViewState } from '../usePickerView/usePickerViewState';

import { errorMessage } from './errorMessage';
import type {
  PickerStateOptions,
  PickerStateValue,
  PickerStatus,
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

  const refreshPacks = useCallback(async () => {
    setPacks(await listPacks());
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
          showStatus(t('status.saved'));

          return true;
        } catch (error) {
          showError(errorMessage(error));

          return false;
        }
      });
    },
    [env, enqueueSettings, showStatus, showError]
  );

  const clearStatus = useCallback(() => {
    setStatus(null);
  }, []);

  const send = useCallback(
    async (item: SendItem) => {
      showStatus(t('status.sending'));

      try {
        await onSend(item);
        clearStatus();
        onClose();
      } catch (error) {
        showError(errorMessage(error) || t('status.sendFailed'));
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
