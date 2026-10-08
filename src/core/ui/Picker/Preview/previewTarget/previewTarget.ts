import type { RemoteGif } from '../../../../db.types';
import { gifCellName } from '../../cellName/cellName';
import type { CellNames } from '../../cellName/cellName.types';
import type { PreviewTarget } from '../PreviewProvider.types';

/**
 * Цель предпросмотра стикера. Одна на ячейку и навигатор ленты: предпросмотр, открытый из меню
 * ячейки и пришедший на неё стрелкой, показывает одно и то же.
 *
 * @param url — object URL стикера
 * @param emoji — эмодзи стикера; нет — над картинкой пусто
 * @param name — имена ячейки
 * @returns цель предпросмотра
 */
export const stickerPreviewTarget = (
  url: string,
  emoji: string | undefined,
  name: CellNames
): PreviewTarget => {
  return { url, emoji, name: name.preview };
};

/**
 * Цель предпросмотра GIF: версия для отправки, а до её загрузки — превью ленты. Одна на ячейку и
 * навигатор ленты, как у стикера.
 *
 * @param gif — GIF ячейки
 * @returns цель предпросмотра
 */
export const gifPreviewTarget = (gif: RemoteGif): PreviewTarget => {
  const { url, previewUrl } = gif;

  return { url, previewUrl, name: gifCellName(gif).preview };
};
