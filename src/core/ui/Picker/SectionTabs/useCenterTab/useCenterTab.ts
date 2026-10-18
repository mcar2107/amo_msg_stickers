import { useLayoutEffect, useRef, useState } from 'preact/hooks';

import { scrollMotion } from '@ui/scrollMotion';
import { centerScrollLeft } from '@ui/SectionTabs/centerScrollLeft';
import { createTabCentering } from '@ui/SectionTabs/tabCentering';
import { placeIndicator } from '@ui/SectionTabs/tabIndicator';

import type { CenterTabRefs } from './useCenterTab.types';

/**
 * Ставит выбранную вкладку по центру видимой части полосы, а индикатор — на её место. Мгновенная
 * прокрутка (`'auto'`) ставит и индикатор без перехода.
 *
 * @param strip — полоса вкладок; `position: relative`, от неё считается `offsetLeft` вкладок
 * @param indicator — индикатор выбранной вкладки
 * @param behavior — движение прокрутки
 * @returns поставлена ли вкладка: скрытая полоса без ширины не прокручивается — расчёт по нулевой
 * ширине увёл бы её за вкладку
 */
const placeTab = (
  strip: HTMLElement | null,
  indicator: HTMLElement | null,
  behavior: ScrollBehavior
): boolean => {
  if (!strip?.clientWidth) return false;

  const tab = strip.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  const place = tab && { left: tab.offsetLeft, width: tab.offsetWidth };

  if (indicator) placeIndicator(indicator, place, behavior === 'auto');

  if (!place) return false;

  strip.scrollTo({
    left: centerScrollLeft(place, {
      width: strip.clientWidth,
      scrollWidth: strip.scrollWidth,
    }),
    behavior,
  });

  return true;
};

/**
 * Держит выбранную вкладку по центру полосы и индикатор на ней: пока полоса видна, полоса
 * доезжает до новой вкладки плавно, а индикатор переезжает к ней; при показе (открытие попапа,
 * возврат в режим «Стикеры») и то и другое сразу стоит на месте.
 *
 * Прокрутка ставится в layout-эффекте, до отрисовки: в обычном эффекте кадр успел бы показать
 * полосу со старой прокруткой. Показ ловит `ResizeObserver` — его колбэк приходит до отрисовки
 * кадра, в котором полоса появилась.
 *
 * Набор вкладок сдвигает выбранную без смены раздела (появились недавние, удалён пак перед ней),
 * поэтому постановка идёт и по нему.
 *
 * @param activeId — раздел выбранной вкладки
 * @param tabsKey — набор вкладок полосы в их порядке
 * @returns ссылки на полосу и индикатор
 */
export const useCenterTab = (activeId: string | null, tabsKey: string): CenterTabRefs => {
  const stripRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [centering] = useState(() => {
    return createTabCentering({
      place: (behavior) => {
        return placeTab(stripRef.current, indicatorRef.current, behavior);
      },
      motion: scrollMotion,
    });
  });

  useLayoutEffect(() => {
    centering.select();
  }, [centering, activeId, tabsKey]);

  useLayoutEffect(() => {
    const strip = stripRef.current;

    if (!strip) return;

    const observer = new ResizeObserver(([entry]) => {
      centering.resize(entry?.contentRect.width || 0);
    });

    observer.observe(strip);

    return () => {
      observer.disconnect();
    };
  }, [centering]);

  return { stripRef, indicatorRef };
};
