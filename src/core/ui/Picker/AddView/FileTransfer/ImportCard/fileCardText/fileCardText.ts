import { t } from '@core/i18n';
import type { FileCard, FileCardPack, ManifestPack } from '@core/libraryFile';
import { hasFileCardAdds } from '@core/libraryFile';
import { packTitle } from '@core/packTitle';

/**
 * Название пака из файла для карточки. Свой пак — на языке интерфейса, как в ленте: в файле его название записано на
 * языке, при котором выгружали.
 *
 * @param pack — пак из файла
 * @returns название для показа
 */
export const filePackTitle = (pack: ManifestPack): string => {
  return packTitle(pack);
};

/**
 * Что импорт сделает с паком. У нового пака — сколько стикеров в нём будет: стикер, id которого занят в другом паке,
 * пропускается, и строка пака сходится с итогом карточки. «Мои стикеры» новым паком не бывают — у них, как у пака
 * из библиотеки, сказано, сколько стикеров добавится; пак без новых стикеров уже в библиотеке.
 *
 * @param cardPack — пак файла, сверенный с библиотекой
 * @returns строка рядом с названием пака
 */
export const filePackCount = (cardPack: FileCardPack): string => {
  const { pack, isNew, newStickers } = cardPack;
  const total = pack.stickers.length;

  if (isNew) return t('add.file.packNew', { total: newStickers.length });
  if (!newStickers.length) return t('add.file.packPresent');

  return t('add.file.packAdds', { count: newStickers.length, total });
};

/**
 * Строка избранного и недавних: часть с нулём не пишется — файл с одним избранным не говорит «в недавние: 0».
 *
 * @param favorites — добавится в избранное
 * @param recent — добавится в недавние
 * @returns строка итога; `undefined` — не добавится ни одного элемента
 */
const listsLine = (favorites: number, recent: number): string | undefined => {
  if (favorites && recent) return t('add.file.listsSummary', { favorites, recent });
  if (favorites) return t('add.file.favoritesSummary', { favorites });
  if (recent) return t('add.file.recentSummary', { recent });

  return undefined;
};

/**
 * Итог карточки: сколько новых паков и стикеров и сколько элементов избранного и недавних добавит импорт, а если
 * нечего — что всё уже в библиотеке. Строка о паках — только когда добавятся стикеры, строка об избранном и недавних —
 * только когда добавится хоть один их элемент: файл с одним избранным не говорит «новых паков: 0, стикеров: 0».
 *
 * @param card — карточка файла
 * @returns строки итога сверху вниз, хотя бы одна
 */
export const fileCardSummary = (card: FileCard): string[] => {
  const { newPackCount, newStickerCount, newFavoriteCount, newRecentCount } = card;
  const lines: string[] = [];

  if (!hasFileCardAdds(card)) return [t('add.file.allInLibrary')];

  if (newStickerCount) {
    lines.push(t('add.file.summary', { packs: newPackCount, stickers: newStickerCount }));
  }

  const lists = listsLine(newFavoriteCount, newRecentCount);

  if (lists) lines.push(lists);

  return lines;
};
