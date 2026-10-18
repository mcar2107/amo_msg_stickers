import { useEffect, useRef } from 'preact/hooks';

import { ensureCustomPack } from '../../../db';
import { errorMessage } from '../PickerProvider/errorMessage';
import { useFavoritesContext } from '../PickerProvider/useFavorites/useFavoritesContext';
import { usePicker } from '../PickerProvider/usePicker';

/**
 * Загрузка на каждое открытие пикера: сброс статуса, свежие настройки, паки и избранное (их могли
 * поменять в другой вкладке). Избранное читается сразу, параллельно настройкам и пакам: лента не
 * ждёт настроек дольше, чем без избранного, а сбой одного чтения не останавливает другое. Порядок паков считается здесь заново и до следующего открытия
 * не меняется. Сбой загрузки (окружение или база недоступны) показывается ошибкой в статусе.
 * Сбой загрузки, завершившейся после закрытия или после более свежего открытия, не
 * показывается: иначе ошибка прошлого открытия встала бы поверх статуса нового.
 *
 * @param isOpen — открыт ли пикер
 */
export const useOpenLoad = (isOpen: boolean) => {
  const { refreshSettings, refreshPacks, clearStatus, showError } = usePicker();
  const { refreshFavorites } = useFavoritesContext();
  const requestRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    requestRef.current += 1;
    const request = requestRef.current;

    /**
     * @param error — причина сбоя загрузки
     */
    const reportFailure = (error: unknown) => {
      if (request === requestRef.current) showError(errorMessage(error));
    };

    const loadFavorites = async () => {
      try {
        await refreshFavorites();
      } catch (error) {
        reportFailure(error);
      }
    };

    const load = async () => {
      try {
        await refreshSettings();
        await ensureCustomPack();
        await refreshPacks({ isReorder: true });
      } catch (error) {
        reportFailure(error);
      }
    };

    clearStatus();
    void loadFavorites();
    void load();

    return () => {
      requestRef.current += 1;
    };
  }, [isOpen, refreshSettings, refreshPacks, refreshFavorites, clearStatus, showError]);
};
