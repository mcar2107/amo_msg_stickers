import { CUSTOM_PACK_ID } from '../../../../db';
import { RECENT_SECTION_ID } from '../../usePickerView/sectionIds';

import type { HeaderAction } from './headerAction.types';

/**
 * Действие заголовка раздела. У «Моих стикеров» меню «…» есть только ради «Выгрузить пак»: пак своих стикеров не
 * удаляется и ссылки на Telegram у него нет, поэтому пустым «Моим стикерам» выгружать нечего, и меню без пунктов в
 * заголовке не появляется.
 *
 * @param sectionId — id раздела: `recent` или id пака
 * @param hasStickers — в разделе есть стикеры
 * @returns действие заголовка; `null` — заголовок без действий
 */
export const headerAction = (
  sectionId: string,
  hasStickers: boolean
): HeaderAction | null => {
  switch (sectionId) {
    case RECENT_SECTION_ID: {
      return 'clear';
    }

    case CUSTOM_PACK_ID: {
      return hasStickers ? 'exportMenu' : null;
    }

    default: {
      return 'menu';
    }
  }
};
