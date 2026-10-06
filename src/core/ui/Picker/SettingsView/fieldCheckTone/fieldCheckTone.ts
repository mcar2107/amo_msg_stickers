import type { FieldTone } from '../../Field/Field.types';
import type { FieldCheck } from '../useSettingsDraft/useSettingsDraft.types';

/**
 * Тон поля по результату проверки: принятый ключ — `valid`, отказ источника и токен не того
 * вида — `invalid`, как ошибка значения. Идущая проверка и сбой проверки о значении ничего не
 * говорят — тона нет.
 *
 * @param check — результат проверки; `undefined` — проверки не было
 * @returns тон поля; `null` — без тона
 */
export const fieldCheckTone = (check: FieldCheck | undefined): FieldTone | null => {
  switch (check) {
    case 'ok': {
      return 'valid';
    }

    case 'rejected':

    case 'badFormat': {
      return 'invalid';
    }

    case undefined:

    case 'checking':

    case 'unavailable': {
      return null;
    }

    default: {
      const unknownCheck: never = check;

      throw new Error(`Unknown field check: ${String(unknownCheck)}`);
    }
  }
};
