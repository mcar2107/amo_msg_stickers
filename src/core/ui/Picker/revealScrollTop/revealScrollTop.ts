/**
 * Прокрутка ленты, при которой ячейка видна целиком, с наименьшим сдвигом от текущей: лента не
 * прыгает, если ячейка уже видна, и встаёт к ближнему краю, если нет. Ячейка выше видимой области
 * целиком не поместится — к верху области встаёт её верх.
 *
 * Считается по геометрии раскладки, а не `scrollIntoView`: тот прокручивает и предков ленты,
 * вплоть до страницы amo.
 *
 * @param top — верх ячейки от начала ленты, в пикселях
 * @param height — высота ячейки
 * @param scrollTop — текущая прокрутка ленты
 * @param viewport — высота видимой области
 * @returns новая прокрутка; равна `scrollTop` — сдвигать не нужно
 */
export const revealScrollTop = (
  top: number,
  height: number,
  scrollTop: number,
  viewport: number
): number => {
  if (top < scrollTop || height > viewport) return top;

  const bottom = top + height;

  return bottom > scrollTop + viewport ? bottom - viewport : scrollTop;
};
