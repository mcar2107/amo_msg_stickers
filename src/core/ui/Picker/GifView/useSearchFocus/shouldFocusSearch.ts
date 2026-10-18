import type { OpenedBy } from '@core/hoverPopup.types';

/**
 * Ставить ли фокус в поиск GIF, когда режим «GIF» стал виден. Открытие наведением не уводит
 * фокус из поля сообщения: пользователь может печатать дальше, глядя на попап. Фокус внутри
 * попапа значит, что пользователь сам кликнул в него — по кнопке режима «GIF», — и курсор
 * ввода из поля сообщения уже ушёл.
 *
 * @param openedBy — чем открыт попап
 * @param hasFocusInside — стоит ли фокус внутри попапа
 * @returns нужно ли перевести фокус в поиск
 */
export const shouldFocusSearch = (
  openedBy: OpenedBy,
  hasFocusInside: boolean
): boolean => {
  return openedBy === 'click' || hasFocusInside;
};
