import { useEffect, useState } from 'preact/hooks';

import { countExportable } from '@core/db';
import { usePicker } from '@ui/PickerProvider';
import { useFavoritesContext } from '@ui/PickerProvider/useFavorites';

/**
 * Сколько всего попадёт в файл библиотеки — стикеры, избранное и недавние GIF — для «Выгрузить библиотеку»: без них
 * выгружать нечего. Пересчитывается на монтирование «Настроек», на каждое перечитывание паков и на смену избранного —
 * импорт, удаление и правка избранного меняют библиотеку, пока экран открыт.
 *
 * Сбой чтения базы оставляет `null`, и кнопка доступна: выгрузка покажет свою ошибку, а недоступная кнопка без
 * причины ничего бы не объяснила. Ответ, пришедший после следующего пересчёта или размонтирования, отбрасывается.
 *
 * @returns число элементов выгрузки; `null` — ещё не посчитано или посчитать не удалось
 */
export const useExportableCount = (): number | null => {
  const { packs } = usePicker();
  const { favorites } = useFavoritesContext();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let isCurrent = true;

    const load = async () => {
      try {
        const next = await countExportable();

        if (isCurrent) setCount(next);
      } catch (error) {
        console.warn('[amo-stickers] exportable count failed', error);
      }
    };

    void load();

    return () => {
      isCurrent = false;
    };
  }, [packs, favorites]);

  return count;
};
