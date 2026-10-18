import { describe, expect, it } from 'vitest';

import type { IndicatorElement } from '@ui/SectionTabs/tabIndicator';
import { placeIndicator } from '@ui/SectionTabs/tabIndicator';

/**
 * Индикатор без DOM: `offsetWidth` записывает, какой переход стоял в момент, когда браузер
 * применил бы стили.
 *
 * @returns индикатор и журнал переходов на моменты применения стилей
 */
const setup = () => {
  const flushes: string[] = [];
  const style = { transform: '', width: '', visibility: '', transition: '' };
  const indicator: IndicatorElement = {
    style,
    get offsetWidth() {
      flushes.push(style.transition);

      return 0;
    },
  };

  return { indicator, style, flushes };
};

describe('placeIndicator', () => {
  it('ставит индикатор на место и ширину вкладки', () => {
    const { indicator, style } = setup();

    placeIndicator(indicator, { left: 42, width: 34 }, false);

    expect(style).toMatchObject({
      transform: 'translateX(42px)',
      width: '34px',
      visibility: '',
    });
  });

  it('с переходом — не трогает переход и не применяет стили раньше браузера', () => {
    const { indicator, style, flushes } = setup();

    placeIndicator(indicator, { left: 42, width: 34 }, false);

    expect(flushes).toEqual([]);
    expect(style.transition).toBe('');
  });

  it('мгновенно — стили применяются без перехода, после этого переход возвращается', () => {
    const { indicator, style, flushes } = setup();

    placeIndicator(indicator, { left: 42, width: 34 }, true);

    expect(flushes).toEqual(['none']);
    expect(style.transition).toBe('');
  });

  it('без выбранной вкладки — скрыт, место не меняется', () => {
    const { indicator, style } = setup();

    placeIndicator(indicator, { left: 42, width: 34 }, true);
    placeIndicator(indicator, null, false);

    expect(style).toMatchObject({ transform: 'translateX(42px)', visibility: 'hidden' });
  });

  it('выбранная вкладка после скрытия — индикатор снова виден', () => {
    const { indicator, style } = setup();

    placeIndicator(indicator, null, false);
    placeIndicator(indicator, { left: 0, width: 34 }, true);

    expect(style.visibility).toBe('');
  });
});
