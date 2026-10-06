import type { PickerScreen } from './usePickerView.types';

/**
 * Снимать ли статус, когда экран закрывается: «Назад», «Готово», переключение режима.
 *
 * «Настройки» пишут несохранённое на уходе: клик по кнопке уводит фокус из поля, и запись
 * показывает «Сохранено» до клика, во время ухода или после размонтирования экрана. Снятие
 * статуса на закрытии стёрло бы итог записи, которую начал этот же уход, — поэтому с
 * «Настроек» статус переезжает в режим как есть. Другого статуса там нет: открытие экрана
 * снимает статус прошлого действия, а ошибки ленты GIF при открытом экране не пишутся.
 *
 * Статус «Добавить стикеры» — про форму, которая уходит вместе с экраном (сборка и размер
 * черновика стикера), и в режиме он был бы ложным.
 *
 * @param screen — закрываемый экран; `null` — экрана нет
 * @returns нужно ли снять статус
 */
export const shouldClearStatusOnClose = (screen: PickerScreen | null): boolean => {
  switch (screen) {
    case 'settings': {
      return false;
    }

    case 'add': {
      return true;
    }

    case null: {
      return true;
    }

    default: {
      const unknownScreen: never = screen;

      throw new Error(`Unknown picker screen: ${String(unknownScreen)}`);
    }
  }
};
