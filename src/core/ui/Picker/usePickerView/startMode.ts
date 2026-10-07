import type { PageStorage } from '../../../pageStorage.types';
import { readMode } from '../../../pickerMode';
import type { PickerMode } from '../../../pickerMode.types';

/**
 * Режим первого открытия попапа на странице: сохранённый, а без него — по библиотеке.
 * Пустая библиотека открывает «GIF»: лента стикеров показала бы одну подсказку.
 *
 * Недоступная библиотека тоже открывает «GIF»: выдача GIF от неё не зависит, а ошибку
 * базы покажет загрузка на открытие.
 *
 * @param storage — хранилище страницы
 * @param countStickers — число стикеров в библиотеке; зовётся, только если режима нет
 * @returns режим для первого открытия
 */
export const startMode = async (
  storage: PageStorage,
  countStickers: () => Promise<number>
): Promise<PickerMode> => {
  const saved = readMode(storage);

  if (saved) return saved;

  try {
    return (await countStickers()) > 0 ? 'stickers' : 'gifs';
  } catch {
    return 'gifs';
  }
};
