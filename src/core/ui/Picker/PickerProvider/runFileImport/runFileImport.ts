import { fileImportFailure } from '../fileImportOutcome/fileImportOutcome';
import type { FileImportPhase } from '../fileImportOutcome/fileImportOutcome.types';

import type { FileImportRun } from './runFileImport.types';

/**
 * Паки после записи. Сбой перечитывания — не сбой импорта: стикеры уже в базе, и ошибка «повторите» у зоны соврала бы, а
 * повтор сказал бы «всё уже в библиотеке». Без паков итог показывается, а лента к разделу не переходит.
 *
 * @param refreshPacks — перечитывание паков
 * @returns паки в порядке ленты; пустой список — перечитать не удалось
 */
const packsAfterWrite = async (refreshPacks: FileImportRun['refreshPacks']) => {
  try {
    return await refreshPacks();
  } catch (error) {
    console.warn('[amo-stickers] packs refresh after file import failed', error);

    return [];
  }
};

/**
 * Ход импорта файла без состояния Preact: провайдер подключает к нему своё состояние колбэками.
 *
 * Карточка сверяется с библиотекой заново: с выбора файла библиотека могла измениться. Если по свежей сверке добавлять
 * нечего, импорт заканчивается без проверки и записи — карточка сама скажет, что всё уже в библиотеке.
 *
 * Отмена действует только до записи: выданные запросы транзакции коммитятся, и «Отменить», нажатая в этот момент, не
 * превращает исход записи в «Импорт отменён». Отмену отличает `signal`, а не вид ошибки: проверка, упавшая своей
 * ошибкой уже после нажатия «Отменить», — тоже отмена.
 *
 * Цель ошибки спрашивается в момент завершения: импорт идёт долго, и пользователь успевает уйти с сегмента или
 * экрана. Паки перечитываются только после записи: упавший импорт библиотеку не меняет, а сбой перечитывания после
 * записи исхода не меняет — импорт удался.
 *
 * @param run — файл, отмена, шаги импорта и колбэки исходов
 */
export const runFileImport = async (run: FileImportRun): Promise<void> => {
  const {
    libraryFile,
    signal,
    loadCard,
    prepare,
    write,
    refreshPacks,
    errorTarget,
    onStart,
    onCard,
    onProgress,
    onWriting,
    onSuccess,
    onError,
    onCancel,
    onFinish,
  } = run;
  let phase: FileImportPhase = 'library';

  onStart();

  try {
    const card = await loadCard(libraryFile);

    onCard(card);
    if (!card.newStickerCount) return;

    phase = 'file';
    const plan = await prepare(libraryFile, card, { signal, onProgress });

    phase = 'write';
    onWriting();
    const written = await write(plan);

    onSuccess(written, await packsAfterWrite(refreshPacks));
  } catch (error) {
    if (phase !== 'write' && signal.aborted) {
      onCancel();
    } else {
      onError(fileImportFailure(phase, error), errorTarget());
    }
  } finally {
    onFinish();
  }
};
