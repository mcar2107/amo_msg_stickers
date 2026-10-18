import { revealScrollTop } from '@ui/revealScrollTop';

import type { FocusScrollInput } from './focusScrollTop.types';

/**
 * Прокрутка тела экрана к цели фокуса: на виду — вся её группа с наименьшим сдвигом, а если группа в область не
 * помещается — хотя бы сама цель. Считается по геометрии, а не `scrollIntoView` и не прокруткой браузера по фокусу:
 * те прокручивают и предков тела, вплоть до страницы amo.
 *
 * @param input — группа и цель в координатах тела, его прокрутка и видимая высота
 * @returns новая прокрутка тела; равна `scrollTop` — сдвигать не нужно
 */
export const focusScrollTop = (input: FocusScrollInput): number => {
  const { group, target, scrollTop, viewport } = input;
  const groupScrollTop = revealScrollTop(group.top, group.height, scrollTop, viewport);

  return revealScrollTop(target.top, target.height, groupScrollTop, viewport);
};
