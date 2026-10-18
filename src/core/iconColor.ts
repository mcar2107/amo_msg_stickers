import type { ButtonMarkup } from './amoDom.types';
import type { IconClassChange, IconColorState } from './iconColor.types';

type ColorClasses = Pick<ButtonMarkup, 'idleClasses' | 'openClasses' | 'editClasses'>;

/**
 * Классы цвета иконки кнопки стикеров по состоянию. Классы состояний заменяют друг друга, а не
 * дополняют: из двух `fill-*` на иконке победил бы тот, что позже в CSS amo. Открытый попап
 * важнее редактирования — как у открытого эмодзи в режиме правки.
 *
 * @param classes — классы цвета разметки кнопки
 * @param state — открыт ли попап и идёт ли редактирование
 * @returns классы, которые поставить, и классы других состояний, которые снять; класс, общий с
 * нужным состоянием, не снимается
 */
export const iconColorClasses = (
  { idleClasses, openClasses, editClasses = [] }: ColorClasses,
  { isOpen, isEditing }: IconColorState
): IconClassChange => {
  const restClasses = isEditing && editClasses.length > 0 ? editClasses : idleClasses;
  const add = isOpen ? openClasses : restClasses;
  const remove = [...idleClasses, ...openClasses, ...editClasses].reduce<string[]>(
    (acc, name) => {
      if (!add.includes(name) && !acc.includes(name)) acc.push(name);

      return acc;
    },
    []
  );

  return { add, remove };
};
