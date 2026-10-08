import { elementById } from '../elementById/elementById';
import { revealScrollTop } from '../revealScrollTop/revealScrollTop';

/**
 * Кнопка ячейки ленты, на которую переключается закреплённый предпросмотр, и прокрутка ленты к
 * ней: ячейка встаёт в видимую область целиком, с наименьшим сдвигом. Закрытие предпросмотра
 * возвращает картинку в эту ячейку и фокус на неё — они должны быть видны.
 *
 * Прокрутка ставится сразу, а не плавно: лента едет под подложкой, а зажатая стрелка шагает
 * быстрее плавного доезда. Окно ленты пересчитывается по событию прокрутки, как при ручной.
 *
 * Кнопки нет в документе (окно ленты её не держит) — ячейка недоступна, и лента не трогается.
 *
 * @param scroller — прокручиваемый элемент ленты; `null` — лента не смонтирована
 * @param id — id кнопки ячейки
 * @param top — верх ячейки от начала ленты по раскладке
 * @param height — высота ячейки по раскладке
 * @returns кнопка ячейки; `null` — её нет в документе
 */
export const revealFeedCell = (
  scroller: HTMLElement | null,
  id: string,
  top: number,
  height: number
): HTMLElement | null => {
  if (!scroller) return null;

  const button = elementById(scroller, id);

  if (!button) return null;

  const { scrollTop, clientHeight } = scroller;
  const next = revealScrollTop(top, height, scrollTop, clientHeight);

  if (next !== scrollTop) scroller.scrollTop = next;

  return button;
};
