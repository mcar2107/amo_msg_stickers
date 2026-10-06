import { t } from '../../../../i18n/translate';
import { parseSetName } from '../../../../sources/telegram';
import { errorMessage } from '../errorMessage';

import type { PackImportRun } from './runPackImport.types';

/**
 * Ход импорта пака без состояния Preact: провайдер подключает к нему своё состояние колбэками.
 *
 * Ссылка без имени пака — ошибка у поля, и импорт не начинается: запроса к Telegram нет, полоса
 * прогресса не мелькает. Пользователь в этот момент сам стоит у поля — отправил форму, поэтому
 * цель ошибки не спрашивается.
 *
 * Цель ошибки начатого импорта спрашивается в момент завершения, а не запуска: импорт идёт долго,
 * и пользователь успевает уйти с сегмента или экрана.
 *
 * @param run — ссылка, импорт и колбэки исходов
 */
export const runPackImport = async (run: PackImportRun): Promise<void> => {
  const {
    link,
    importSet,
    refreshPacks,
    errorTarget,
    onStart,
    onSuccess,
    onError,
    onFinish,
  } = run;

  if (!parseSetName(link)) {
    onError(t('error.telegram.badLink'), 'field');

    return;
  }

  onStart();

  try {
    const pack = await importSet(link);

    await refreshPacks();
    onSuccess(pack);
  } catch (error) {
    /**
     * Вкладка пака могла появиться на первом шаге импорта, а упавший импорт пак убирает,
     * возвращает прежним или, после отказа встроенного бота, оставляет частично — список
     * перечитываем, чтобы вкладки совпали с библиотекой.
     */
    await refreshPacks();
    onError(errorMessage(error), errorTarget());
  } finally {
    onFinish();
  }
};
