import { describe, expect, it } from 'vitest';

import { sectionScrollPlan } from '@ui/StickersMode/sectionScrollPlan';

const VIEWPORT = 400;
const MAX_SCROLL = 5000;

describe('sectionScrollPlan', () => {
  it('близкий раздел — плавно, без прыжка', () => {
    expect(
      sectionScrollPlan({ from: 0, to: 300, viewport: VIEWPORT, maxScroll: MAX_SCROLL })
    ).toEqual({
      jumpTo: null,
      target: 300,
    });
    expect(
      sectionScrollPlan({
        from: 1000,
        to: 700,
        viewport: VIEWPORT,
        maxScroll: MAX_SCROLL,
      })
    ).toEqual({
      jumpTo: null,
      target: 700,
    });
  });

  it('ровно одна видимая область — ещё без прыжка', () => {
    expect(
      sectionScrollPlan({ from: 0, to: 400, viewport: VIEWPORT, maxScroll: MAX_SCROLL })
    ).toEqual({
      jumpTo: null,
      target: 400,
    });
    expect(
      sectionScrollPlan({ from: 800, to: 400, viewport: VIEWPORT, maxScroll: MAX_SCROLL })
    ).toEqual({
      jumpTo: null,
      target: 400,
    });
  });

  it('далёкий раздел ниже — прыжок на видимую область выше цели', () => {
    expect(
      sectionScrollPlan({ from: 0, to: 2000, viewport: VIEWPORT, maxScroll: MAX_SCROLL })
    ).toEqual({
      jumpTo: 1600,
      target: 2000,
    });
    expect(
      sectionScrollPlan({ from: 100, to: 501, viewport: VIEWPORT, maxScroll: MAX_SCROLL })
    ).toEqual({
      jumpTo: 101,
      target: 501,
    });
  });

  it('далёкий раздел выше — прыжок на видимую область ниже цели', () => {
    expect(
      sectionScrollPlan({
        from: 3000,
        to: 500,
        viewport: VIEWPORT,
        maxScroll: MAX_SCROLL,
      })
    ).toEqual({
      jumpTo: 900,
      target: 500,
    });
  });

  it('цель за концом ленты зажимается в конец прокрутки', () => {
    expect(
      sectionScrollPlan({ from: 0, to: 6000, viewport: VIEWPORT, maxScroll: MAX_SCROLL })
    ).toEqual({
      jumpTo: 4600,
      target: 5000,
    });
    expect(
      sectionScrollPlan({
        from: 4800,
        to: 5300,
        viewport: VIEWPORT,
        maxScroll: MAX_SCROLL,
      })
    ).toEqual({
      jumpTo: null,
      target: 5000,
    });
  });

  it('цель выше начала ленты зажимается в ноль', () => {
    expect(
      sectionScrollPlan({
        from: 1000,
        to: -50,
        viewport: VIEWPORT,
        maxScroll: MAX_SCROLL,
      })
    ).toEqual({
      jumpTo: 400,
      target: 0,
    });
  });

  it('лента короче видимой области — цель в нуле, без прыжка', () => {
    expect(
      sectionScrollPlan({ from: 0, to: 200, viewport: VIEWPORT, maxScroll: -100 })
    ).toEqual({
      jumpTo: null,
      target: 0,
    });
  });

  it('цель совпадает с текущей прокруткой — без прыжка', () => {
    expect(
      sectionScrollPlan({ from: 500, to: 500, viewport: VIEWPORT, maxScroll: MAX_SCROLL })
    ).toEqual({
      jumpTo: null,
      target: 500,
    });
  });
});
