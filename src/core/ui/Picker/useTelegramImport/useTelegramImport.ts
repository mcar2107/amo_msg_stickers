import { usePicker } from '@ui/PickerProvider';

import type { TelegramImportState } from './useTelegramImport.types';

/**
 * Форма импорта пака из Telegram по ссылке: карточка пака под полем, прогресс полосой и статусом
 * ««название»: N/M», вкладка пака — после первого готового стикера, по завершении — переход в
 * пак.
 *
 * Пока идёт импорт из файла, импорт из Telegram недоступен: два импорта одновременно не идут.
 *
 * Уход с экрана импорт не отменяет: он доводится до конца и открывает пак, а отменяет его только
 * `cancelImport`. Ход импорта, ссылку, карточку и ошибку поля хранит провайдер, поэтому после
 * возврата на экран в поле та же ссылка и виден ход импорта.
 *
 * @returns ссылка, ошибка поля, карточка с ходом импорта, его запуск и отмена
 */
export const useTelegramImport = (): TelegramImportState => {
  const { packImport, fileImport } = usePicker();
  const {
    link,
    fieldError,
    isPackMissing,
    card,
    changeLink,
    isImporting,
    importPack,
    cancelImport,
  } = packImport;
  const hasLink = link.trim() !== '';

  return {
    link,
    hasLink,
    fieldError,
    isPackMissing,
    card,
    changeLink,
    isImporting,
    isBlocked: fileImport.isImporting,
    startImport: importPack,
    cancelImport,
  };
};
