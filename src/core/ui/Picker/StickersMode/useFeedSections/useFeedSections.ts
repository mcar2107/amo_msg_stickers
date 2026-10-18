import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  clearRecent,
  deletePack,
  deleteRecent,
  deleteSticker,
  listAllStickers,
  listRecent,
} from '@core/db';
import type { SendItem } from '@core/db.types';
import { usePicker } from '@ui/PickerProvider';
import { errorMessage } from '@ui/PickerProvider/errorMessage';
import { useFavoritesContext } from '@ui/PickerProvider/useFavorites';
import { feedSections } from '@ui/StickersMode/feedSections';

import type { FeedRead, FeedSections } from './useFeedSections.types';

/**
 * Разделы ленты стикеров: вся библиотека одним чтением, недавние стикеры и избранное из контекста.
 *
 * Лента перечитывается на каждое открытие пикера — отправка закрывает его, и без этого
 * отправленный стикер не поднялся бы в недавних — и на каждое обновление `packs`: `refreshPacks`
 * зовут импорт, создание и удаление стикеров и паков. Пока идёт перечитывание, видна прежняя
 * лента — без мигания пустого состояния, но с признаком, что она прочитана для прежних `packs`.
 *
 * Разделы считаются от прочитанного и записей избранного синхронно: правка избранного пересчитывает
 * ленту без нового чтения базы. Пока избранное не прочитано, разделов нет — иначе на первом открытии
 * «Избранное» вклинилось бы первым в уже показанную ленту.
 *
 * @param isOpen — открыт ли пикер
 * @returns разделы ленты, удаление стикера и пака, уборка недавних
 */
export const useFeedSections = (isOpen: boolean): FeedSections => {
  const { packs, refreshPacks, dropUrl, showError } = usePicker();
  const { favorites } = useFavoritesContext();
  const [read, setRead] = useState<FeedRead | null>(null);

  /**
   * Номер последнего чтения: ответ устаревшего чтения (импорт поверх открытия, закрытие до
   * ответа базы) не перетирает свежую ленту.
   */
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    requestRef.current += 1;
    const request = requestRef.current;
    const [byPack, recent] = await Promise.all([
      listAllStickers(),
      listRecent('sticker'),
    ]);

    if (request !== requestRef.current) return;

    setRead({ byPack, recent, packs });
  }, [packs]);

  const sections = useMemo(() => {
    if (!read || !favorites) return null;

    return feedSections(read.packs, read.byPack, read.recent, favorites);
  }, [read, favorites]);

  useEffect(() => {
    if (!isOpen) return;

    void reload();

    return () => {
      requestRef.current += 1;
    };
  }, [isOpen, reload]);

  const removeSticker = useCallback(
    async (stickerId: string) => {
      try {
        await deleteSticker(stickerId);
        dropUrl(stickerId);
        await refreshPacks();
      } catch (error) {
        showError(errorMessage(error));
      }
    },
    [dropUrl, refreshPacks, showError]
  );

  const removeRecent = useCallback(
    async (item: SendItem) => {
      try {
        await deleteRecent(item);
        await reload();
      } catch (error) {
        showError(errorMessage(error));
      }
    },
    [reload, showError]
  );

  /**
   * Object URL стикеров пака отзываются по прочитанному разделу: после удаления пака его
   * стикеров в базе уже нет. Недавние с этими стикерами пропадут из ленты сами — их стикеров
   * больше нет в библиотеке.
   */
  const removePack = useCallback(
    async (packId: string) => {
      const section = sections?.find(({ id }) => {
        return id === packId;
      });

      try {
        await deletePack(packId);
        for (const { sticker } of section?.items || []) dropUrl(sticker.id);
        await refreshPacks();
      } catch (error) {
        showError(errorMessage(error));
      }
    },
    [sections, dropUrl, refreshPacks, showError]
  );

  /**
   * Очищаются только недавние стикеры: недавние GIF живут в режиме «GIF» отдельно.
   */
  const clearRecentStickers = useCallback(async () => {
    try {
      await clearRecent('sticker');
      await reload();
    } catch (error) {
      showError(errorMessage(error));
    }
  }, [reload, showError]);

  return {
    sections,
    isCurrent: read?.packs === packs,
    removeSticker,
    removeRecent,
    removePack,
    clearRecentStickers,
  };
};
