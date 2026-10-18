import { describe, expect, it } from 'vitest';

import { isPageEscape } from '@core/pageEscape';

const panel = { name: 'panel' };
const preview = { name: 'preview' };
const composer = { name: 'composer' };
const body = { name: 'body' };

/**
 * @param key — клавиша
 * @param path — путь события от цели к окну
 * @param isComposing — идёт ли набор IME
 * @returns срез `keydown`
 */
const keyDown = (key: string, path: readonly object[], isComposing = false) => {
  return {
    key,
    isComposing,
    composedPath: () => {
      return [...path];
    },
  };
};

const INSIDERS = [panel, preview];

describe('isPageEscape', () => {
  it('Escape в поле ввода amo — перехватывается', () => {
    expect(isPageEscape(keyDown('Escape', [composer, body]), INSIDERS)).toBe(true);
  });

  it('Escape на странице без фокуса — перехватывается', () => {
    expect(isPageEscape(keyDown('Escape', [body]), INSIDERS)).toBe(true);
  });

  it('Escape внутри панели и предпросмотра — остаётся им', () => {
    expect(isPageEscape(keyDown('Escape', [{}, panel, body]), INSIDERS)).toBe(false);
    expect(isPageEscape(keyDown('Escape', [{}, preview, body]), INSIDERS)).toBe(false);
  });

  it('другая клавиша — не трогается', () => {
    expect(isPageEscape(keyDown('Enter', [composer, body]), INSIDERS)).toBe(false);
  });

  it('Escape набора IME — отмена набора, не трогается', () => {
    expect(isPageEscape(keyDown('Escape', [composer, body], true), INSIDERS)).toBe(false);
  });
});
