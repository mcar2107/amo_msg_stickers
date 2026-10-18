import type { ScrollBox, ScrollMemory } from './scrollMemory.types';

/**
 * Прокрутка элементов скрытого режима. Скрытие `display: none` сбрасывает её в ноль, поэтому
 * она запоминается на каждую прокрутку и возвращается при показе.
 *
 * Элемент, ушедший из документа, забывается: иначе память держала бы размонтированное
 * представление до конца жизни страницы.
 *
 * @returns память прокрутки одного режима
 */
export const createScrollMemory = (): ScrollMemory => {
  const offsets = new Map<ScrollBox, number>();

  return {
    remember: (box) => {
      offsets.set(box, box.scrollTop);
    },
    restore: () => {
      for (const [box, scrollTop] of offsets) {
        if (box.isConnected) {
          box.scrollTop = scrollTop;
        } else {
          offsets.delete(box);
        }
      }
    },
  };
};
