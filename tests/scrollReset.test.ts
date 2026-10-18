import { describe, expect, it } from 'vitest';

import type { ResetBox } from '@ui/MasonryGrid/scrollReset';
import { createScrollReset } from '@ui/MasonryGrid/scrollReset';

/**
 * Элемент, которому тест меняет ширину: показ скрытой ленты.
 */
type TestBox = { -readonly [Key in keyof ResetBox]: ResetBox[Key] };

/**
 * Ширина видимой ленты.
 */
const VISIBLE_WIDTH = 336;

/**
 * Прокручиваемый элемент без браузера.
 *
 * @param scrollTop — прокрутка
 * @param clientWidth — ширина; 0 — элемент скрыт
 * @returns элемент ленты
 */
const box = (scrollTop: number, clientWidth = VISIBLE_WIDTH): TestBox => {
  return { scrollTop, clientWidth };
};

describe('createScrollReset', () => {
  it('прокручивает видимую ленту к началу по запросу сброса', () => {
    const reset = createScrollReset();
    const feed = box(695);

    reset.request();

    expect(reset.apply(feed)).toBe(true);
    expect(feed.scrollTop).toBe(0);
  });

  it('без запроса сброса прокрутку не трогает', () => {
    const reset = createScrollReset();
    const feed = box(1500);

    expect(reset.apply(feed)).toBe(false);
    expect(feed.scrollTop).toBe(1500);
  });

  it('сброс скрытой ленты ждёт показа и перекрывает прокрутку, возвращённую при показе', () => {
    const reset = createScrollReset();
    const feed = box(1500, 0);

    reset.request();

    expect(reset.apply(feed)).toBe(false);

    feed.clientWidth = VISIBLE_WIDTH;
    feed.scrollTop = 420;

    expect(reset.apply(feed)).toBe(true);
    expect(feed.scrollTop).toBe(0);
  });

  it('сбрасывает один раз на запрос: следующая прокрутка остаётся', () => {
    const reset = createScrollReset();
    const feed = box(700);

    reset.request();
    reset.apply(feed);
    feed.scrollTop = 300;

    expect(reset.apply(feed)).toBe(false);
    expect(feed.scrollTop).toBe(300);
  });
});
