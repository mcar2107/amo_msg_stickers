import type { Pack } from '../../../../db.types';
import type { ImportErrorTarget } from '../finishImport/finishImport.types';

export type PackImportRun = {
  /**
   * Ссылка на пак или его имя, как ввёл пользователь.
   */
  link: string;

  /**
   * Импортирует пак по ссылке: запросы к Telegram, конвертация и запись в базу.
   */
  importSet: (link: string) => Promise<Pack>;

  /**
   * Перечитывает паки: вкладки должны совпасть с библиотекой и после успеха, и после ошибки.
   */
  refreshPacks: () => Promise<void>;

  /**
   * Куда показать ошибку в момент завершения импорта.
   */
  errorTarget: () => ImportErrorTarget;

  /**
   * Импорт начался: ссылка разобрана, идёт запрос.
   */
  onStart: () => void;

  /**
   * Пак импортирован, паки перечитаны.
   */
  onSuccess: (pack: Pack) => void;

  /**
   * Импорт не удался или не начался: ссылка без имени пака — всегда у поля.
   */
  onError: (message: string, target: ImportErrorTarget) => void;

  /**
   * Начатый импорт завершился любым исходом.
   */
  onFinish: () => void;
};
