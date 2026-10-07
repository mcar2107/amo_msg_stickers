import type { PageStorage } from './pageStorage.types';
import type { PickerMode } from './pickerMode.types';

export const MODE_KEY = 'amo-stickers:mode';

/**
 * @param value — значение из хранилища
 * @returns режим или `null`, если значение не из допустимых
 */
const toPickerMode = (value: string | null): PickerMode | null => {
  switch (value) {
    case 'stickers':

    case 'gifs': {
      return value;
    }

    default: {
      return null;
    }
  }
};

/**
 * `localStorage` бросает при запрете хранилища сайта и в части приватных режимов — тогда режима
 * будто нет, и вызывающая сторона выберет его по библиотеке.
 *
 * @param storage — хранилище страницы
 * @returns сохранённый режим; `null` — нет значения, значение не из допустимых или хранилище недоступно
 */
export const readMode = (storage: PageStorage): PickerMode | null => {
  try {
    return toPickerMode(storage.getItem(MODE_KEY));
  } catch {
    return null;
  }
};

/**
 * Режим — удобство интерфейса: несохранённый не мешает переключению, поэтому сбой записи
 * не выходит наружу.
 *
 * @param storage — хранилище страницы
 * @param mode — режим для следующего открытия
 */
export const writeMode = (storage: PageStorage, mode: PickerMode) => {
  try {
    storage.setItem(MODE_KEY, mode);
  } catch {
    /**
     * Хранилище недоступно — режим живёт до перезагрузки страницы.
     */
  }
};
