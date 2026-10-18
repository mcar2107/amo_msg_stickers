import { describe, expect, it } from 'vitest';

import { menuPosition } from '@ui/Menu/menuPosition';

const PANEL = { left: 100, top: 100, right: 452, bottom: 500 };
const SIZE = { width: 160, height: 80 };

const point = (x: number, y: number) => {
  return { left: x, top: y, right: x, bottom: y };
};

describe('menuPosition', () => {
  it('меню от точки встаёт правее и ниже неё', () => {
    expect(menuPosition(point(150, 200), SIZE, PANEL)).toEqual({ left: 150, top: 200 });
  });

  it('меню от кнопки встаёт под её левым краем', () => {
    const button = { left: 150, top: 200, right: 174, bottom: 224 };

    expect(menuPosition(button, SIZE, PANEL)).toEqual({ left: 150, top: 224 });
  });

  it('меню у правого края панели сдвигается влево внутрь панели', () => {
    const button = { left: 420, top: 120, right: 444, bottom: 144 };

    expect(menuPosition(button, SIZE, PANEL)).toEqual({ left: 288, top: 144 });
  });

  it('меню у левого края панели сдвигается вправо внутрь панели', () => {
    expect(menuPosition(point(90, 200), SIZE, PANEL)).toEqual({ left: 104, top: 200 });
  });

  it('без места снизу меню встаёт над источником', () => {
    const button = { left: 150, top: 450, right: 174, bottom: 474 };

    expect(menuPosition(button, SIZE, PANEL)).toEqual({ left: 150, top: 370 });
    expect(menuPosition(point(150, 480), SIZE, PANEL)).toEqual({ left: 150, top: 400 });
  });

  it('без места ни снизу, ни сверху меню прижато к низу панели', () => {
    const tall = { width: 160, height: 300 };

    expect(menuPosition(point(150, 300), tall, PANEL)).toEqual({ left: 150, top: 196 });
  });

  it('меню выше панели прижато к её верху', () => {
    const huge = { width: 160, height: 500 };

    expect(menuPosition(point(150, 300), huge, PANEL)).toEqual({ left: 150, top: 104 });
  });
});
