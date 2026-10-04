import { useCallback, useRef, useState } from 'preact/hooks';

import { t } from '../../../i18n/translate';
import { importTelegramSet } from '../../../sources/telegram';
import type { ImportProgress } from '../../../sources/telegram.types';

import { finishImport } from './finishImport/finishImport';
import { errorMessage } from './errorMessage';
import type { PackImportOptions, PackImportState } from './PickerProvider.types';

/**
 * Импорт пака из Telegram на уровне провайдера. Провайдер живёт всё время страницы, а
 * форма импорта размонтируется при уходе с вкладки «Добавить стикеры»: состояние здесь
 * переживает уход и возврат, и второй импорт поверх идущего не запускается.
 *
 * Статус ««название»: N/M» виден на любой вкладке, вкладка пака появляется после первого
 * готового стикера. По завершении лента прокручивается к паку, только если экран «Добавить
 * стикеры» всё ещё открыт.
 *
 * @param options — окружение, настройки и методы провайдера
 * @returns ход импорта и его запуск
 */
export const usePackImport = (options: PackImportOptions): PackImportState => {
  const { env, settings, screen, refreshPacks, showStatus, showError, scrollToSection } =
    options;
  const [isImporting, setIsImporting] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);

  /**
   * Экран на момент завершения, а не запуска: импорт идёт долго, и пользователь успевает уйти с
   * экрана «Добавить».
   */
  const screenRef = useRef(screen);

  screenRef.current = screen;

  const importPack = useCallback(
    async (link: string) => {
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

      setIsImporting(true);
      setPercent(0);

      try {
        const pack = await importTelegramSet(
          env,
          settings.telegramToken,
          link,
          trackProgress
        );

        await refreshPacks();
        finishImport({ screen: screenRef.current, pack, scrollToSection, showStatus });
      } catch (error) {
        /**
         * Вкладка пака могла появиться на первом шаге импорта, а упавший импорт пак убирает,
         * возвращает прежним или, после отказа встроенного бота, оставляет частично — список
         * перечитываем, чтобы вкладки совпали с библиотекой.
         */
        await refreshPacks();
        showError(errorMessage(error));
      } finally {
        setIsImporting(false);
        setPercent(null);
      }
    },
    [isImporting, env, settings, refreshPacks, showStatus, showError, scrollToSection]
  );

  return { isImporting, percent, importPack };
};
