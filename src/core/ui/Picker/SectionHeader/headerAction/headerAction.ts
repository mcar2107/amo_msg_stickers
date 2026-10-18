import { CUSTOM_PACK_ID } from '../../../../db';
import { FAVORITE_SECTION_ID, RECENT_SECTION_ID } from '../../usePickerView/sectionIds';

import type { HeaderAction } from './headerAction.types';

/**
 * Действие заголовка раздела. У «Моих стикеров» его нет: пак своих стикеров не удаляется, а
 * меню без пунктов в заголовке было бы пустым. У «Избранного» тоже: элемент убирается из него
 * только пунктом меню ячейки, очистки целиком нет.
 *
 * @param sectionId — id раздела: `favorite`, `recent` или id пака
 * @returns действие заголовка; `null` — заголовок без действий
 */
export const headerAction = (sectionId: string): HeaderAction | null => {
  switch (sectionId) {
    case RECENT_SECTION_ID: {
      return 'clear';
    }

    case FAVORITE_SECTION_ID: {
      return null;
    }

    case CUSTOM_PACK_ID: {
      return null;
    }

    default: {
      return 'menu';
    }
  }
};
