import type { RemoteGif, StickerRec } from '@core/db.types';
import { t } from '@core/i18n';

import type { CellNames } from './cellName.types';

/**
 * Имена кнопок ячейки стикера. Подпись своего стикера — то, что на нём написано, и по ней его
 * узнают на слух; у стикера из Telegram подписи нет, и соседние стикеры отличает эмодзи.
 *
 * Каждое имя — целая фраза словаря, а не глагол плюс имя стикера: склейка переведённых кусков навязала
 * бы английскому русский порядок слов. Подпись и эмодзи — данные пользователя и не переводятся.
 *
 * @param sticker — подпись и эмодзи стикера; нет обоих — имена без них
 * @returns имена кнопки отправки, контекстного меню и предпросмотра
 */
export const stickerCellName = (
  sticker: Pick<StickerRec, 'emoji' | 'caption'>
): CellNames => {
  const { emoji, caption } = sticker;

  if (caption) {
    return {
      send: t('cell.sticker.sendCaption', { caption }),
      menu: t('cell.sticker.menuCaption', { caption }),
      preview: t('cell.sticker.previewCaption', { caption }),
    };
  }

  if (emoji) {
    return {
      send: t('cell.sticker.sendEmoji', { emoji }),
      menu: t('cell.sticker.menuEmoji', { emoji }),
      preview: t('cell.sticker.previewEmoji', { emoji }),
    };
  }

  return {
    send: t('cell.sticker.send'),
    menu: t('cell.sticker.menu'),
    preview: t('cell.sticker.preview'),
  };
};

/**
 * Имена кнопок ячейки найденной GIF. Название GIF — данные источника и не переводится.
 *
 * @param gif — GIF из поиска
 * @returns имена кнопки отправки, контекстного меню и предпросмотра
 */
export const gifCellName = (gif: RemoteGif): CellNames => {
  const { title } = gif;

  if (title) {
    return {
      send: t('cell.gif.sendTitle', { title }),
      menu: t('cell.gif.menuTitle', { title }),
      preview: t('cell.gif.previewTitle', { title }),
    };
  }

  return {
    send: t('cell.gif.send'),
    menu: t('cell.gif.menu'),
    preview: t('cell.gif.preview'),
  };
};
