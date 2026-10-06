import { useCallback, useRef, useState } from 'preact/hooks';

import { t } from '../../../i18n/translate';
import { importTelegramSet } from '../../../sources/telegram';
import type { ImportProgress } from '../../../sources/telegram.types';

import { finishImport, importErrorTarget } from './finishImport/finishImport';
import type { ImportErrorTarget } from './finishImport/finishImport.types';
import { runPackImport } from './runPackImport/runPackImport';
import type { PackImportOptions, PackImportState } from './PickerProvider.types';

/**
 * Импорт пака из Telegram на уровне провайдера. Провайдер живёт всё время страницы, а
 * форма импорта размонтируется при закрытии экрана «Добавить стикеры»: ход импорта, введённая
 * ссылка и ошибка поля переживают уход и возврат, и второй импорт поверх идущего не
 * запускается.
 *
 * Статус ««название»: N/M» виден на любом экране, вкладка пака появляется после первого
 * готового стикера. По завершении лента прокручивается к паку, только если экран «Добавить
 * стикеры» всё ещё открыт. Ошибка — у поля ссылки, если поле на виду, иначе в статусе.
 *
 * @param options — окружение, настройки, вид и методы провайдера
 * @returns ссылка, ошибка поля, ход импорта и его запуск
 */
export const usePackImport = (options: PackImportOptions): PackImportState => {
  const {
    env,
    settings,
    screen,
    addSegment,
    refreshPacks,
    showStatus,
    showError,
    clearStatus,
    scrollToSection,
  } = options;
  const [link, setLink] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);

  /**
   * Экран и сегмент на момент завершения, а не запуска: импорт идёт долго, и пользователь
   * успевает уйти с экрана «Добавить» или на другой сегмент.
   */
  const screenRef = useRef(screen);
  const segmentRef = useRef(addSegment);

  screenRef.current = screen;
  segmentRef.current = addSegment;

  const changeLink = useCallback((nextLink: string) => {
    setLink(nextLink);
    setFieldError(null);
  }, []);

  const importPack = useCallback(async () => {
    if (isImporting) return;

    const trackProgress = ({ done, total, title }: ImportProgress) => {
      setPercent(total ? (done / total) * 100 : 0);
      showStatus(t('status.importProgress', { title, done, total }));

      /**
       * Первый готовый стикер — сразу показываем вкладку пака, не дожидаясь импорта
       * целиком.
       */
      if (done === 1) void refreshPacks();
    };

    const showImportError = (message: string, target: ImportErrorTarget) => {
      switch (target) {
        case 'field': {
          /**
           * Строка статуса ошибку не дублирует, а ход импорта ««название»: N/M» в ней
           * устарел.
           */
          setFieldError(message);
          clearStatus();

          return;
        }

        case 'status': {
          showError(message);

          return;
        }

        default: {
          const unknownTarget: never = target;

          throw new Error(`Unknown import error target: ${String(unknownTarget)}`);
        }
      }
    };

    await runPackImport({
      link,
      importSet: (setLink) => {
        return importTelegramSet(env, settings.telegramToken, setLink, trackProgress);
      },
      refreshPacks,
      errorTarget: () => {
        return importErrorTarget(screenRef.current, segmentRef.current);
      },
      onStart: () => {
        setIsImporting(true);
        setPercent(0);
        setFieldError(null);
      },
      onSuccess: (pack) => {
        setLink('');
        setFieldError(null);
        finishImport({ screen: screenRef.current, pack, scrollToSection, showStatus });
      },
      onError: showImportError,
      onFinish: () => {
        setIsImporting(false);
        setPercent(null);
      },
    });
  }, [
    isImporting,
    link,
    env,
    settings,
    refreshPacks,
    showStatus,
    showError,
    clearStatus,
    scrollToSection,
  ]);

  return { link, fieldError, changeLink, isImporting, percent, importPack };
};
