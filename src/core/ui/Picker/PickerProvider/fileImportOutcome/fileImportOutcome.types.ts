import type { Pack } from '../../../../db.types';
import type { ImportWritten } from '../../../../libraryFile/importRecords.types';
import type {
  PickerScreen,
  SectionMotion,
} from '../../usePickerView/usePickerView.types';

/**
 * Шаг импорта файла, на котором он упал: `library` — чтение состояния библиотеки, `file` — проверка стикеров
 * файла, `write` — запись в библиотеку.
 */
export type FileImportPhase = 'library' | 'file' | 'write';

/**
 * Ошибка импорта файла для показа.
 */
export type FileImportFailure = {
  /**
   * Текст ошибки на языке интерфейса.
   */
  message: string;

  /**
   * Повтор того же файла может удаться: сбой записи или чтения библиотеки. Ложь — файл не прошёл проверку, и «Импорт»
   * недоступна до выбора другого файла.
   */
  isRetryable: boolean;
};

export type FinishFileImportOptions = {
  /**
   * Экран поверх режима в момент завершения импорта; `null` — экрана нет.
   */
  screen: PickerScreen | null;

  /**
   * Паки библиотеки после импорта в порядке ленты.
   */
  packs: readonly Pick<Pack, 'id'>[];

  /**
   * Что записал импорт.
   */
  written: ImportWritten;

  /**
   * Открывает режим «Стикеры» и прокручивает ленту к разделу.
   */
  scrollToSection: (sectionId: string, motion: SectionMotion) => void;

  /**
   * Показывает итог импорта в статусе.
   */
  showStatus: (text: string) => void;
};
