import type { RefObject } from 'preact';
import { useCallback, useRef } from 'preact/hooks';

import { usePicker } from '../../PickerProvider/usePicker';
import type { PreviewNavigator } from '../../Preview/PreviewProvider.types';
import { stickerPreviewTarget } from '../../Preview/previewTarget/previewTarget';
import { revealFeedCell } from '../../revealFeedCell/revealFeedCell';
import type { StickerLayout } from '../../stickerLayout/stickerLayout.types';
import type { FeedSticker } from '../../StickersMode/feedSections/feedSections.types';
import { cellId } from '../cellId';
import { stickerNeighbor } from '../stickerNeighbor/stickerNeighbor';

/**
 * id кнопки ячейки ленты стикеров по разделу и стикеру.
 *
 * @param sectionId — раздел ячейки
 * @param cell — стикер ячейки
 * @returns id кнопки
 */
const feedCellId = (sectionId: string, cell: FeedSticker): string => {
  return cellId(sectionId, cell.key);
};

/**
 * Навигатор ленты стикеров для закреплённого предпросмотра: сосед ячейки по раскладке, прокрутка
 * ленты к нему и его кнопка с целью предпросмотра, той же, что у ячейки.
 *
 * Функция стабильна, а раскладку и `urlOf` читает из ref на момент шага: предпросмотр хранит
 * навигатор, захваченный при открытии, а раскладка за это время меняется — лента стикеров
 * перечитывается, ширина ленты меняется.
 *
 * @param layout — раскладка ленты; `null` — рядов нет
 * @param scrollRef — прокручиваемый элемент ленты
 * @returns навигатор ленты
 */
export const useStickerNavigator = (
  layout: StickerLayout<FeedSticker> | null,
  scrollRef: RefObject<HTMLElement>
): PreviewNavigator => {
  const { urlOf } = usePicker();
  const latestRef = useRef({ layout, urlOf });

  latestRef.current = { layout, urlOf };

  return useCallback(
    (source, direction) => {
      const { layout: current, urlOf: objectUrl } = latestRef.current;

      if (!current) return null;

      const neighbor = stickerNeighbor(current.rows, source.id, direction, feedCellId);

      if (!neighbor) return null;

      const { row, item } = neighbor;
      const { sectionId, top, height } = row;
      const { key, sticker, name } = item;
      const button = revealFeedCell(
        scrollRef.current,
        cellId(sectionId, key),
        top,
        height
      );

      if (!button) return null;

      return {
        target: stickerPreviewTarget(
          objectUrl(sticker.id, sticker.blob),
          sticker.emoji,
          name
        ),
        source: button,
      };
    },
    [scrollRef]
  );
};
