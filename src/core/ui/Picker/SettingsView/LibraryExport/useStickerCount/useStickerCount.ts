import { useEffect, useState } from 'preact/hooks';

import { countStickers } from '@core/db';
import { usePicker } from '@ui/PickerProvider';

/**
 * Число стикеров библиотеки для «Выгрузить библиотеку»: без стикеров выгружать нечего. Пересчитывается на монтирование
 * «Настроек» и на каждое перечитывание паков — импорт и удаление меняют библиотеку, пока экран открыт.
 *
 * Сбой чтения базы оставляет `null`, и кнопка доступна: выгрузка покажет свою ошибку, а недоступная кнопка без
 * причины ничего бы не объяснила. Ответ, пришедший после следующего пересчёта или размонтирования, отбрасывается.
 *
 * @returns число стикеров; `null` — ещё не посчитано или посчитать не удалось
 */
export const useStickerCount = (): number | null => {
  const { packs } = usePicker();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let isCurrent = true;

    const load = async () => {
      try {
        const next = await countStickers();

        if (isCurrent) setCount(next);
      } catch (error) {
        console.warn('[amo-stickers] sticker count failed', error);
      }
    };

    void load();

    return () => {
      isCurrent = false;
    };
  }, [packs]);

  return count;
};
