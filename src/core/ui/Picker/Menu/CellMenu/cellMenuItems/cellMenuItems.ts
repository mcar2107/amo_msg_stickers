import type { CellRemoveKind } from '@ui/Menu/CellMenu';

import type { CellMenuItemId } from './cellMenuItems.types';

/**
 * Состав меню ячейки по порядку: «Предпросмотр» всегда первый, пункт избранного — второй, удаление — только там, где
 * у ячейки есть что убирать. У найденной GIF и ячейки «Избранного» `kind` нет, и меню состоит из двух пунктов.
 *
 * @param kind — что убирает пункт удаления; нет — удаления нет
 * @returns пункты меню сверху вниз
 */
export const cellMenuItems = (kind: CellRemoveKind | undefined): CellMenuItemId[] => {
  if (kind === undefined) return ['preview', 'favorite'];

  return ['preview', 'favorite', 'remove'];
};
