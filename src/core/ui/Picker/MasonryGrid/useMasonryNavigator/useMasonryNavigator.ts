import type { RefObject } from 'preact';
import { useCallback, useRef } from 'preact/hooks';

import type { RemoteGif } from '../../../../db.types';
import { gifCellName } from '../../cellName/cellName';
import type { PreviewNavigator } from '../../Preview/PreviewProvider.types';
import { gifPreviewTarget } from '../../Preview/previewTarget/previewTarget';
import { revealFeedCell } from '../../revealFeedCell/revealFeedCell';
import { gifItemCellId } from '../gifCellId';
import { masonryNeighbor } from '../masonryNeighbor/masonryNeighbor';
import type { MasonryTile } from '../splitColumns/splitColumns.types';

/**
 * Навигатор ленты GIF для закреплённого предпросмотра: соседняя плитка по раскладке, прокрутка
 * ленты к ней и её кнопка с целью предпросмотра, той же, что у ячейки.
 *
 * Функция стабильна, а плитки читает из ref на момент шага: предпросмотр хранит навигатор,
 * захваченный при открытии, а выдача подгружается и пока он открыт.
 *
 * @param tiles — плитки раскладки в порядке выдачи; `null` — раскладки нет
 * @param scrollRef — прокручиваемый элемент ленты
 * @returns навигатор ленты
 */
export const useMasonryNavigator = (
  tiles: readonly MasonryTile<RemoteGif>[] | null,
  scrollRef: RefObject<HTMLElement>
): PreviewNavigator => {
  const tilesRef = useRef(tiles);

  tilesRef.current = tiles;

  return useCallback(
    (source, direction) => {
      const current = tilesRef.current;

      if (!current) return null;

      const tile = masonryNeighbor(current, source.id, direction, gifItemCellId);

      if (!tile) return null;

      const { sectionId, item, top, height } = tile;
      const button = revealFeedCell(
        scrollRef.current,
        gifItemCellId(sectionId, item),
        top,
        height
      );

      return button
        ? { target: gifPreviewTarget(item, gifCellName(item)), source: button }
        : null;
    },
    [scrollRef]
  );
};
