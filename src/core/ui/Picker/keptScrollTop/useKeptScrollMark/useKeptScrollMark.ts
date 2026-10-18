import { useEffect, useMemo, useState } from 'preact/hooks';

import type { KeptScroll } from '@ui/keptScrollTop/createKeptScroll';
import { createKeptScroll } from '@ui/keptScrollTop/createKeptScroll';

/**
 * Удержание места ленты режима на время правки избранного. Закрытие попапа снимает метку: правка,
 * не дошедшая до ленты к закрытию, не сдвигает её при следующем открытии.
 *
 * Удержание привязано к избранному рендера: метка из обработчика берёт избранное на момент выбора
 * пункта, лента сообщает раскладку вместе с избранным, из которого она собрана, — и раскладка
 * чужой перестройки (подгрузка выдачи, импорт пака) метку не тратит.
 *
 * @param isOpen — попап открыт
 * @param revision — избранное, из которого собраны разделы ленты этого рендера
 * @returns удержание места ленты; новое при каждой смене избранного
 */
export const useKeptScrollMark = (isOpen: boolean, revision: unknown): KeptScroll => {
  const [control] = useState(createKeptScroll<unknown>);

  useEffect(() => {
    if (!isOpen) control.drop();
  }, [isOpen, control]);

  return useMemo(() => {
    return {
      keep: () => {
        control.keep(revision);
      },
      drop: control.drop,
      settle: (cells, element) => {
        return control.settle(cells, element, revision);
      },
    };
  }, [control, revision]);
};
