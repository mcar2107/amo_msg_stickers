import type { Pack, RecentRec } from '@core/db.types';
import { t } from '@core/i18n';
import type { FileImportProgress } from '@core/libraryFile';
import type { FileImportStage } from '@ui/PickerProvider';
import { errorMessage } from '@ui/PickerProvider/errorMessage';
import { isRecentStickerShown } from '@ui/StickersMode/feedSections';
import { FAVORITE_SECTION_ID, RECENT_SECTION_ID } from '@ui/usePickerView';

import type {
  FileImportFailure,
  FileImportPhase,
  FinishFileImportOptions,
} from './fileImportOutcome.types';

/**
 * Раздел, к которому встаёт лента после импорта: первый по порядку ленты, а не первый в файле, — иначе лента
 * встала бы посреди добавленного, и разделы выше остались бы незамеченными.
 *
 * @param packs — паки библиотеки в порядке ленты
 * @param addedPackIds — паки, в которые импорт добавил стикеры
 * @returns id раздела; `null` — импорт ничего не добавил
 */
export const firstAddedSection = (
  packs: readonly Pick<Pack, 'id'>[],
  addedPackIds: readonly string[]
): string | null => {
  const added = new Set(addedPackIds);
  const pack = packs.find(({ id }) => {
    return added.has(id);
  });

  return pack ? pack.id : null;
};

/**
 * Покажет ли лента стикеров раздел «Недавние» — по тому же условию, что сама лента (`isRecentStickerShown`). Запрос
 * перехода к разделу, которого в ленте нет, ждал бы его появления и сдвинул бы ленту позже, посреди чужого действия.
 *
 * @param recent — записи недавних стикеров
 * @param stickerIds — id стикеров библиотеки
 * @param favoriteKeys — ключи избранного
 * @returns true — раздел «Недавние» будет в ленте
 */
export const isRecentSectionShown = (
  recent: readonly RecentRec[],
  stickerIds: readonly string[],
  favoriteKeys: readonly string[]
): boolean => {
  const ids = new Set(stickerIds);
  const favorites = new Set(favoriteKeys);

  return recent.some(({ item }) => {
    return isRecentStickerShown(item, ids, favorites);
  });
};

/**
 * Перечитывание избранного без исключения наружу: импорт уже записан, и сбой чтения — не сбой импорта.
 *
 * @param refreshFavorites — перечитывание избранного провайдера
 * @returns true — избранное перечитано
 */
const refreshFavoritesQuietly = async (
  refreshFavorites: FinishFileImportOptions['refreshFavorites']
) => {
  try {
    await refreshFavorites();

    return true;
  } catch (error) {
    console.warn('[amo-stickers] favorites refresh after file import failed', error);

    return false;
  }
};

/**
 * Раздел ленты стикеров с добавленным: «Избранное», затем «Недавние», затем первый пак — по порядку ленты. Избранные
 * GIF ленту стикеров не меняют, поэтому к «Избранному» ведут только избранные стикеры. «Избранное» без перечитанного
 * избранного и «Недавние», которых лента не покажет, пропускаются: переход к разделу, которого в ленте нет, ждал бы
 * его появления.
 *
 * @param options — паки, записанное и проверка раздела «Недавние»
 * @param isFavoritesFresh — избранное перечитано после записи
 * @returns id раздела; `null` — стикеров в ленте не добавилось
 */
const importedSection = async (
  options: FinishFileImportOptions,
  isFavoritesFresh: boolean
): Promise<string | null> => {
  const { packs, written, isRecentShown } = options;

  if (written.hasFavoriteStickers && isFavoritesFresh) return FAVORITE_SECTION_ID;
  if (written.hasRecentStickers && (await isRecentShown())) return RECENT_SECTION_ID;

  return firstAddedSection(packs, written.packIds);
};

/**
 * Итог импорта файла. Дождавшийся импорта на экране «Добавить стикеры» попадает к добавленному в ленте, ушедший с
 * экрана за время импорта уже смотрит что-то своё — лента и режим не двигаются, итог виден только в статусе.
 *
 * Избранное и недавние перечитываются при любом экране: импорт меняет обе ленты, и без этого добавленное появилось бы
 * только после следующего открытия попапа.
 *
 * Переход закрывает экран вместе с «Импорт», на которой стоял фокус, — поэтому фокус встаёт на вкладку раздела, а не
 * падает в `body`.
 *
 * Переход мгновенный, а статус — после него: `scrollToSection` сбрасывает статус прошлого действия. Без новых стикеров
 * статус говорит об избранном и недавних: «Добавлено стикеров: 0» после импорта, который их добавил, звучал бы как
 * провал.
 *
 * Промис не отклоняется.
 *
 * @param options — экран, паки, записанное и колбэки провайдера
 */
export const finishFileImport = async (
  options: FinishFileImportOptions
): Promise<void> => {
  const {
    screen,
    written,
    scrollToSection,
    showStatus,
    refreshFavorites,
    refreshRecent,
  } = options;
  const { stickerCount, favoriteCount, recentCount } = written;

  refreshRecent();
  const isFavoritesFresh = await refreshFavoritesQuietly(refreshFavorites);
  const sectionId =
    screen === 'add' ? await importedSection(options, isFavoritesFresh) : null;

  if (sectionId) scrollToSection(sectionId, 'instant', { shouldFocusTab: true });

  showStatus(
    !stickerCount && favoriteCount + recentCount
      ? t('status.fileImportListsDone')
      : t('status.fileImportDone', { count: stickerCount })
  );
};

/**
 * Браузер отказал в записи по квоте хранилища.
 *
 * @param error — причина отказа транзакции
 * @returns true — не хватило места
 */
const isQuotaError = (error: unknown) => {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
};

/**
 * Ошибка импорта файла для показа и доступность повтора. Сбой записи не меняет библиотеку, и повтор того же файла
 * может удаться, а файл, не прошедший проверку, не пройдёт её и снова.
 *
 * @param phase — шаг, на котором упал импорт
 * @param error — причина отказа
 * @returns текст и доступность повтора
 */
export const fileImportFailure = (
  phase: FileImportPhase,
  error: unknown
): FileImportFailure => {
  switch (phase) {
    case 'library': {
      return { message: errorMessage(error), isRetryable: true };
    }

    case 'file': {
      return { message: errorMessage(error), isRetryable: false };
    }

    case 'write': {
      if (isQuotaError(error)) {
        return { message: t('error.libraryFile.quota'), isRetryable: true };
      }

      return {
        message: t('error.libraryFile.writeFailed', { message: errorMessage(error) }),
        isRetryable: true,
      };
    }

    default: {
      throw new Error(`Unknown file import phase: ${String(phase satisfies never)}`);
    }
  }
};

/**
 * Что строка статуса говорит о ходе импорта файла. Пока сегмент «Файл» на виду, ход показывает карточка, и строка
 * статуса его не дублирует; ушедший с сегмента видит ход только в ней. Спрашивается на каждый шаг хода и на уход с
 * сегмента и возврат: запись хода не сообщает, и ушедший посреди записи без этого не увидел бы «Запись…».
 *
 * @param stage — этап идущего импорта
 * @param progress — ход проверки; `null` — проверка ещё не сообщила хода
 * @param isFormShown — сегмент «Файл» на виду
 * @returns текст статуса; `null` — строку статуса очистить
 */
export const fileImportStatus = (
  stage: FileImportStage,
  progress: FileImportProgress | null,
  isFormShown: boolean
): string | null => {
  if (isFormShown) return null;

  switch (stage) {
    case 'checking': {
      return progress ? t('status.fileImportProgress', progress) : null;
    }

    case 'writing': {
      return t('status.fileImportWriting');
    }

    default: {
      throw new Error(`Unknown file import stage: ${String(stage satisfies never)}`);
    }
  }
};
