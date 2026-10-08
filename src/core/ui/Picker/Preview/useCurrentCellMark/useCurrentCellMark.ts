import { useEffect } from 'preact/hooks';

import type { PreviewState } from '../PreviewProvider.types';

/**
 * Атрибут кнопки ячейки, которую показывает закреплённый предпросмотр: по нему `picker.css`
 * рисует кольцо фокуса.
 */
export const CURRENT_CELL_ATTRIBUTE = 'data-preview-current';

/**
 * Отмечает в ленте ячейку, которую показывает закреплённый предпросмотр с навигатором ленты:
 * фокус в это время в диалоге, и без отметки под прозрачной подложкой не видно, куда привели
 * стрелки и куда вернётся фокус. У предпросмотра удержания и превью черновика соседей нет —
 * их ячейка не отмечается. Уходящий предпросмотр уже закрыт, и отметка снимается сразу.
 *
 * Атрибут ставится на узел напрямую, а не пропом ячейки: проп, зависящий от текущей ячейки,
 * перерисовывал бы всю ленту на каждый шаг. Preact атрибуты, которых нет в пропсах, не трогает.
 *
 * @param preview — открытый предпросмотр
 */
export const useCurrentCellMark = (preview: PreviewState | null): void => {
  const isMarked =
    preview !== null &&
    preview.mode === 'pinned' &&
    preview.navigate !== null &&
    !preview.isLeaving;
  const cell = isMarked ? preview.source : null;

  useEffect(() => {
    if (!cell) return;

    cell.setAttribute(CURRENT_CELL_ATTRIBUTE, '');

    return () => {
      cell.removeAttribute(CURRENT_CELL_ATTRIBUTE);
    };
  }, [cell]);
};
