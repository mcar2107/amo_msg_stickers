import type { PageStorage } from '../../../pageStorage.types';
import { readMode } from '../../../pickerMode';
import type { PickerMode } from '../../../pickerMode.types';

/**
 * @param count — подсчёт стикеров
 * @returns есть ли хоть один стикер; сбой подсчёта — нет
 */
const hasAny = async (count: () => Promise<number>): Promise<boolean> => {
  try {
    return (await count()) > 0;
  } catch {
    return false;
  }
};

/**
 * Режим первого открытия попапа на странице: сохранённый, а без него — по библиотеке и избранному.
 * Без единого стикера открывается «GIF»: лента стикеров показала бы одну подсказку. Избранный стикер
 * считается наравне со стикером библиотеки: после удаления всех паков он остаётся в «Избранном».
 *
 * Недоступная база тоже открывает «GIF»: выдача GIF от неё не зависит, а ошибку
 * базы покажет загрузка на открытие.
 *
 * @param storage — хранилище страницы
 * @param countStickers — число стикеров в библиотеке; зовётся, только если режима нет
 * @param countFavoriteStickers — число избранных стикеров; зовётся, только если в библиотеке стикеров нет
 * @returns режим для первого открытия
 */
export const startMode = async (
  storage: PageStorage,
  countStickers: () => Promise<number>,
  countFavoriteStickers: () => Promise<number>
): Promise<PickerMode> => {
  const saved = readMode(storage);

  if (saved) return saved;

  if (await hasAny(countStickers)) return 'stickers';

  return (await hasAny(countFavoriteStickers)) ? 'stickers' : 'gifs';
};
