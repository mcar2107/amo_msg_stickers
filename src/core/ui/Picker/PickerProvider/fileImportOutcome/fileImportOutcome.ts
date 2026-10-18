import type { Pack } from '../../../../db.types';
import { t } from '../../../../i18n/translate';
import type { FileImportProgress } from '../../../../libraryFile/prepareImport.types';
import { errorMessage } from '../errorMessage';
import type { FileImportStage } from '../PickerProvider.types';

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
 * Итог импорта файла. Дождавшийся импорта на экране «Добавить стикеры» попадает к добавленному в ленте, ушедший с
 * экрана за время импорта уже смотрит что-то своё — лента и режим не двигаются, итог виден только в статусе.
 *
 * Переход закрывает экран вместе с «Импорт», на которой стоял фокус, — поэтому фокус встаёт на вкладку раздела, а не
 * падает в `body`.
 *
 * Переход мгновенный, а статус — после него: `scrollToSection` сбрасывает статус прошлого действия.
 *
 * @param options — экран, паки, записанное и колбэки провайдера
 */
export const finishFileImport = (options: FinishFileImportOptions): void => {
  const { screen, packs, written, scrollToSection, showStatus } = options;
  const sectionId = screen === 'add' ? firstAddedSection(packs, written.packIds) : null;

  if (sectionId) scrollToSection(sectionId, 'instant', { shouldFocusTab: true });

  showStatus(t('status.fileImportDone', { count: written.stickerCount }));
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
