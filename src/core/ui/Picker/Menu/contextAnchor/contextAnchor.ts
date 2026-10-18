import type { Box, MenuPoint } from '@ui/Menu/menuPosition';

/**
 * Источник контекстного меню ячейки. Правый клик даёт точку внутри ячейки — меню встаёт от неё.
 * Клавиша меню и `Shift+F10` шлют то же событие, но точку браузер ставит по-своему, вплоть до
 * угла окна: точка вне ячейки — меню встаёт от самой ячейки.
 *
 * @param point — точка события `contextmenu` в координатах окна
 * @param rect — прямоугольник ячейки в координатах окна
 * @returns точка клика нулевого размера или прямоугольник ячейки
 */
export const contextAnchor = (point: MenuPoint, rect: Box): Box => {
  const { left, top } = point;
  const isInside =
    left >= rect.left && left <= rect.right && top >= rect.top && top <= rect.bottom;

  if (!isInside) return rect;

  return { left, top, right: left, bottom: top };
};
