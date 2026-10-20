import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { clearRecent, deleteRecent, listRecent } from '@core/db';
import type { RemoteGif } from '@core/db.types';
import { recentGifs } from '@ui/GifView/gifSections';
import { usePicker } from '@ui/PickerProvider';
import { errorMessage } from '@ui/PickerProvider/errorMessage';

import type { RecentGifs } from './useRecentGifs.types';

/**
 * Недавно отправленные GIF. Список перечитывается на каждое открытие пикера: отправка
 * закрывает его, и без этого отправленный GIF не поднялся бы наверх. И на смену
 * `recentRevision` провайдера: импорт файла меняет недавние при открытом пикере. Ответ, пришедший после
 * закрытия или после более свежего чтения, отбрасывается. Так же отбрасывается и сбой уборки:
 * панель после закрытия остаётся смонтированной, и ошибка забытого действия всплыла бы в статусе
 * следующего открытия.
 *
 * @param isOpen — открыт ли пикер
 * @returns недавние GIF, свежие первыми, и их уборка
 */
export const useRecentGifs = (isOpen: boolean): RecentGifs => {
  const { showError, recentRevision } = usePicker();
  const [recent, setRecent] = useState<RemoteGif[]>([]);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    requestRef.current += 1;
    const request = requestRef.current;

    try {
      const records = await listRecent('gif');

      if (request === requestRef.current) setRecent(recentGifs(records));
    } catch (error) {
      if (request === requestRef.current) showError(errorMessage(error));
    }
  }, [showError]);

  useEffect(() => {
    if (!isOpen) return;

    void reload();

    return () => {
      requestRef.current += 1;
    };
  }, [isOpen, reload, recentRevision]);

  const remove = useCallback(
    async (gif: RemoteGif) => {
      const request = requestRef.current;

      try {
        await deleteRecent({ kind: 'remote', gif });
      } catch (error) {
        if (request === requestRef.current) showError(errorMessage(error));

        return;
      }

      await reload();
    },
    [reload, showError]
  );

  /**
   * Очищаются только недавние GIF: недавние стикеры живут в режиме «Стикеры» отдельно.
   */
  const clear = useCallback(async () => {
    const request = requestRef.current;

    try {
      await clearRecent('gif');
    } catch (error) {
      if (request === requestRef.current) showError(errorMessage(error));

      return;
    }

    await reload();
  }, [reload, showError]);

  return { recent, remove, clear };
};
