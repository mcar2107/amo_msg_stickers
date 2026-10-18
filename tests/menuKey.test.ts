import { describe, expect, it } from 'vitest';

import { isMenuKey } from '@ui/Menu/menuKey';

const NO_MODIFIERS = { shiftKey: false, ctrlKey: false, altKey: false, metaKey: false };

describe('isMenuKey', () => {
  it('Shift+F10 открывает меню', () => {
    expect(isMenuKey({ ...NO_MODIFIERS, key: 'F10', shiftKey: true })).toBe(true);
  });

  it('клавиша контекстного меню открывает меню', () => {
    expect(isMenuKey({ ...NO_MODIFIERS, key: 'ContextMenu' })).toBe(true);
  });

  it('F10 без Shift — не меню', () => {
    expect(isMenuKey({ ...NO_MODIFIERS, key: 'F10' })).toBe(false);
  });

  it('Ctrl+Shift+F10 — не меню', () => {
    expect(
      isMenuKey({ ...NO_MODIFIERS, key: 'F10', shiftKey: true, ctrlKey: true })
    ).toBe(false);
  });

  it('клавиша меню с модификатором — не меню', () => {
    expect(isMenuKey({ ...NO_MODIFIERS, key: 'ContextMenu', altKey: true })).toBe(false);
  });

  it('обычная клавиша — не меню', () => {
    expect(isMenuKey({ ...NO_MODIFIERS, key: 'Enter' })).toBe(false);
  });
});
