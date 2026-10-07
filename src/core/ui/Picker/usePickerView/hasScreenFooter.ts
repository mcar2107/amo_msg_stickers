import type { PickerScreen } from './usePickerView.types';

/**
 * Есть ли у экрана футер. Строка статуса на экране с футером встаёт над ним и не закрывает
 * главную кнопку, а без футера стоит у низа панели, как в режиме.
 *
 * Ответ совпадает с `footer` экрана в его компоненте: футер — часть экрана, а строка статуса
 * лежит слоем панели вне него, и панель ставит её по экрану до отрисовки, без замера.
 * «Добавить стикеры» держит в футере «Импорт» и «Сохранить», «Настройки» пишут значения сами
 * и футера не имеют.
 *
 * @param screen — открытый экран; `null` — экрана нет
 * @returns есть ли футер
 */
export const hasScreenFooter = (screen: PickerScreen | null): boolean => {
  switch (screen) {
    case 'add': {
      return true;
    }

    case 'settings': {
      return false;
    }

    case null: {
      return false;
    }

    default: {
      const unknownScreen: never = screen;

      throw new Error(`Unknown picker screen: ${String(unknownScreen)}`);
    }
  }
};
