import type { Settings } from '../../../../host.types';
import type { KeyCheck } from '../../../../sources/gifs.types';

/**
 * Состояние проверки поля: идёт запрос, ответ источника о ключе или токен не того вида.
 */
export type FieldCheck = 'checking' | KeyCheck | 'badFormat';

/**
 * Результаты проверки по полям; поля без результата нет.
 */
export type SettingsChecks = Partial<Record<keyof Settings, FieldCheck>>;

export type SettingsDraft = {
  /**
   * Значения полей формы, как введены.
   */
  draft: Settings;

  /**
   * Результаты проверки изменённых значений.
   */
  checks: SettingsChecks;

  /**
   * Ввод в поле: запись — через паузу ввода, результат проверки поля снимается.
   */
  changeField: (key: keyof Settings, value: string) => void;

  /**
   * Фиксация значений — уход фокуса из поля, Enter: несохранённое пишется сразу,
   * изменённые значения проверяются.
   */
  commit: () => void;
};
