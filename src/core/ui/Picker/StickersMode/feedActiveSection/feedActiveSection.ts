import type { StickerLayout } from '@ui/stickerLayout';
import { activeSection } from '@ui/stickerLayout';

/**
 * Недолёт `scrollTop` до конца ленты, при котором она уже прокручена до конца: браузер округляет
 * дробную прокрутку вниз на долю пикселя.
 */
const END_SLACK = 1;

/**
 * Активный раздел ленты стикеров: раздел в верху видимой области, а у ленты, прокрученной до
 * конца, — последний раздел. Заголовок короткого последнего раздела не может встать вверх:
 * прокрутка упирается в конец ленты, и без этого после перехода к нему подсветилась бы вкладка
 * предыдущего.
 *
 * Лента, которая целиком помещается в видимую область, стоит в начале, а не в конце: активен
 * первый раздел. Высота области `0` — панель скрыта, конец ленты не определить.
 *
 * @param layout — раскладка ленты
 * @param scrollTop — прокрутка ленты
 * @param viewport — высота видимой области ленты
 * @returns id активного раздела; `null` — разделов нет
 */
export const feedActiveSection = <T>(
  layout: StickerLayout<T>,
  scrollTop: number,
  viewport: number
): string | null => {
  const { sectionTops, total } = layout;
  const isScrollable = viewport > 0 && total > viewport;
  const isAtEnd = isScrollable && scrollTop >= total - viewport - END_SLACK;
  const last = sectionTops.at(-1);

  if (isAtEnd && last) return last.sectionId;

  return activeSection(sectionTops, scrollTop);
};
