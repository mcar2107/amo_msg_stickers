import { t } from '../../../../i18n/translate';
import type { FieldCheck } from '../useSettingsDraft/useSettingsDraft.types';

/**
 * Текст результата проверки у поля. Зовётся в рендере: язык интерфейса выбирается при старте,
 * после вычисления модулей.
 *
 * @param check — результат проверки; `undefined` — проверки не было
 * @param source — имя источника ключа в тексте отказа
 * @returns текст под полем; пустая строка — результата нет
 */
export const fieldCheckText = (check: FieldCheck | undefined, source: string): string => {
  switch (check) {
    case undefined: {
      return '';
    }

    case 'checking': {
      return t('settings.check.checking');
    }

    case 'ok': {
      return t('settings.check.ok');
    }

    case 'rejected': {
      return t('settings.check.rejected', { source });
    }

    case 'unavailable': {
      return t('settings.check.unavailable');
    }

    case 'badFormat': {
      return t('settings.check.badToken');
    }

    default: {
      const unknownCheck: never = check;

      throw new Error(`Unknown field check: ${String(unknownCheck)}`);
    }
  }
};
