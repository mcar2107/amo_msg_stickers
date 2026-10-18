import { describe, expect, it } from 'vitest';

import { previewAttributes, shouldReturnFocus } from '@ui/Preview/previewA11y';

describe('previewAttributes', () => {
  it('закреплённый предпросмотр — диалог с именем и без aria-hidden', () => {
    expect(previewAttributes('pinned', 'Предпросмотр стикера «привет»')).toEqual({
      role: 'dialog',
      'aria-label': 'Предпросмотр стикера «привет»',
    });
  });

  it('предпросмотр удержания скрыт от скринридера, без роли и имени', () => {
    expect(previewAttributes('hold', 'Предпросмотр GIF')).toEqual({
      'aria-hidden': 'true',
    });
  });
});

describe('shouldReturnFocus', () => {
  it('Escape и клик возвращают фокус на источник в документе', () => {
    expect(shouldReturnFocus('escape', { isConnected: true })).toBe(true);
    expect(shouldReturnFocus('click', { isConnected: true })).toBe(true);
  });

  it('источник вне документа фокус не получает', () => {
    expect(shouldReturnFocus('escape', { isConnected: false })).toBe(false);
    expect(shouldReturnFocus('click', { isConnected: false })).toBe(false);
  });

  it('уход фокуса не возвращает его', () => {
    expect(shouldReturnFocus('focusout', { isConnected: true })).toBe(false);
  });
});
