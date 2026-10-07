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
 * Отменённый импорт перечитывает паки, как и упавший: вкладка нового пака уже могла появиться.
 *
 * @param run — ссылка, отмена, импорт и колбэки исходов
 */
export const runPackImport = async (run: PackImportRun): Promise<void> => {
  const {
    link,
    signal,
    importSet,
    refreshPacks,
    errorTarget,
    onStart,
    onSuccess,
    onError,
    onCancel,
    onFinish,
  } = run;

  if (!parseSetName(link)) {
    onError(t('error.telegram.badLink'), 'field');

    return;
  }

  onStart();

  try {
    const pack = await importSet(link, signal);

    await refreshPacks();
    onSuccess(pack);
  } catch (error) {
    /**
     * Вкладка пака могла появиться на первом шаге импорта, а упавший импорт пак убирает,
     * возвращает прежним или, после отказа встроенного бота, оставляет частично — список
     * перечитываем, чтобы вкладки совпали с библиотекой.
     */
    await refreshPacks();

    /**
     * Отмену отличает `signal`, а не вид ошибки: запрос в полёте мог упасть своей ошибкой уже
     * после нажатия «Отменить», и пользователь увидел бы её вместо «Импорт отменён».
     */
    if (signal.aborted) {
      onCancel();
    } else {
      onError(errorMessage(error), errorTarget());
    }
  } finally {
    onFinish();
  }
};
