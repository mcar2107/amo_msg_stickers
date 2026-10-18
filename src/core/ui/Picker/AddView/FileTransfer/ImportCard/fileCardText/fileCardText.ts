import { t } from '@core/i18n';
import type { ManifestPack } from '@core/libraryFile';
import type { FileCard, FileCardPack } from '@core/libraryFile';
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
 * Итог карточки: сколько новых паков и стикеров добавит импорт, а если нечего — что всё уже в библиотеке.
 *
 * @param card — карточка файла
 * @returns строка итога
 */
export const fileCardSummary = (card: FileCard): string => {
  const { newPackCount, newStickerCount } = card;

  if (!newStickerCount) return t('add.file.allInLibrary');

  return t('add.file.summary', { packs: newPackCount, stickers: newStickerCount });
};
