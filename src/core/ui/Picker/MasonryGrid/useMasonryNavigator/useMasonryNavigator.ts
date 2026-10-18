import type { RefObject } from 'preact';
import { useCallback, useRef } from 'preact/hooks';

import type { RemoteGif } from '@core/db.types';
import { gifCellName } from '@ui/cellName';
import { gifItemCellId } from '@ui/MasonryGrid/gifCellId';
import { masonryNeighbor } from '@ui/MasonryGrid/masonryNeighbor';
import type { MasonryTile } from '@ui/MasonryGrid/splitColumns';
import type { PreviewNavigator } from '@ui/Preview';
import { gifPreviewTarget } from '@ui/Preview/previewTarget';
import { revealFeedCell } from '@ui/revealFeedCell';

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
