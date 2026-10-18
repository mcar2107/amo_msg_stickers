import { describe, expect, it } from 'vitest';

import { centerScrollLeft } from '@ui/SectionTabs/centerScrollLeft';

const STRIP = { width: 200, scrollWidth: 600 };

describe('centerScrollLeft', () => {
  it('вкладка в середине полосы встаёт центром в центр видимой части', () => {
    expect(centerScrollLeft({ left: 283, width: 34 }, STRIP)).toBe(200);
  });

  it('вкладка не в середине содержимого тоже встаёт по центру', () => {
    expect(centerScrollLeft({ left: 250, width: 34 }, STRIP)).toBe(167);
    expect(centerScrollLeft({ left: 120, width: 40 }, STRIP)).toBe(40);
  });

  it('первая вкладка прокручивает полосу к началу', () => {
    expect(centerScrollLeft({ left: 6, width: 34 }, STRIP)).toBe(0);
  });

  it('последняя вкладка прокручивает полосу к концу', () => {
    expect(centerScrollLeft({ left: 560, width: 34 }, STRIP)).toBe(400);
  });

  it('полоса без переполнения не прокручивается', () => {
    expect(
      centerScrollLeft({ left: 100, width: 34 }, { width: 200, scrollWidth: 200 })
    ).toBe(0);
    expect(
      centerScrollLeft({ left: 150, width: 34 }, { width: 200, scrollWidth: 190 })
    ).toBe(0);
  });
});
