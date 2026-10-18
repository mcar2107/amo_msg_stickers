import { describe, expect, it } from 'vitest';

import { cellMenuItems } from '../src/core/ui/Picker/Menu/CellMenu/cellMenuItems/cellMenuItems';

describe('cellMenuItems', () => {
  it('найденная GIF и ячейка «Избранного» без kind: «Предпросмотр» и избранное', () => {
    expect(cellMenuItems(undefined)).toEqual(['preview', 'favorite']);
  });

  it('недавняя GIF и недавний стикер: «Предпросмотр», избранное, затем удаление', () => {
    expect(cellMenuItems('recent')).toEqual(['preview', 'favorite', 'remove']);
  });

  it('стикер пака: «Предпросмотр», избранное, затем удаление', () => {
    expect(cellMenuItems('sticker')).toEqual(['preview', 'favorite', 'remove']);
  });
});
