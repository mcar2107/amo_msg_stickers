import { usePicker } from '../PickerProvider/usePicker';

import type { TelegramImportState } from './useTelegramImport.types';

/**
 * Форма импорта пака из Telegram по ссылке: прогресс полосой и статусом ««название»: N/M»,
 * вкладка пака — после первого готового стикера, по завершении — переход в пак.
 *
 * Импорт не отменяется уходом с экрана: он доводится до конца и открывает пак. Ход импорта,
 * ссылку и ошибку поля хранит провайдер, поэтому после возврата на экран в поле та же ссылка,
 * видна полоса прогресса, а кнопка «Импорт» недоступна, пока импорт не закончится.
 *
 * @returns ссылка, ошибка поля, ход импорта и его запуск
 */
export const useTelegramImport = (): TelegramImportState => {
  const { packImport } = usePicker();
  const { link, fieldError, changeLink, isImporting, progress, importPack } = packImport;
  const hasLink = link.trim() !== '';

  return {
    link,
    hasLink,
    fieldError,
    changeLink,
    isImporting,
    progress,
    startImport: importPack,
  };
};
