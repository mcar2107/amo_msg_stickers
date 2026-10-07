import { useEffect, useRef } from 'preact/hooks';

import { ensureCustomPack } from '../../../db';
import { errorMessage } from '../PickerProvider/errorMessage';
import { usePicker } from '../PickerProvider/usePicker';

/**
 * Загрузка на каждое открытие пикера: сброс статуса, свежие настройки и паки (их могли
 * поменять в другой вкладке). Порядок паков считается здесь заново и до следующего открытия
 * не меняется. Сбой загрузки (окружение или база недоступны) показывается ошибкой в статусе.
 * Сбой загрузки, завершившейся после закрытия или после более свежего открытия, не
 * показывается: иначе ошибка прошлого открытия встала бы поверх статуса нового.
 *
 * @param isOpen — открыт ли пикер
 */
export const useOpenLoad = (isOpen: boolean) => {
  const { refreshSettings, refreshPacks, clearStatus, showError } = usePicker();
  const requestRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    requestRef.current += 1;
    const request = requestRef.current;

    const load = async () => {
      clearStatus();

      try {
        await refreshSettings();
        await ensureCustomPack();
        await refreshPacks({ isReorder: true });
      } catch (error) {
        if (request === requestRef.current) showError(errorMessage(error));
      }
    };

    void load();

    return () => {
      requestRef.current += 1;
    };
  }, [isOpen, refreshSettings, refreshPacks, clearStatus, showError]);
};
