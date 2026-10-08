import type { FunctionComponent as FC } from 'preact';

import { packLink } from '../../../packLink';
import { PreviewNavigationContext } from '../Preview/PreviewNavigationContext';
import { SectionHeader } from '../SectionHeader/SectionHeader';
import { FEED_PANEL_ID, sectionTabId } from '../SectionTabs/sectionTabIds';
import type { RowRange, StickerRow } from '../stickerLayout/stickerLayout.types';
import type {
  FeedSection,
  FeedSticker,
} from '../StickersMode/feedSections/feedSections.types';

import { FeedRow } from './FeedRow/FeedRow';
import { useStickerNavigator } from './useStickerNavigator/useStickerNavigator';
import type { StickerFeedProps } from './StickerFeed.types';

/**
 * Отступы по бокам — у прокручиваемого элемента: ширина его содержимого, по которой считается
 * сторона ячейки, уже без них и без полосы прокрутки. Полоса — `feed-scroll` из `picker.css`.
 */
const FEED_CLASS = 'feed-scroll min-h-0 flex-1 overflow-y-auto px-2';

/**
 * Лента разделов режима «Стикеры»: контейнер высотой во всю ленту и в нём абсолютно поставленные
 * ряды окна — остальные ряды в документ не попадают. Ячейки получают навигатор ленты: закреплённый
 * предпросмотр ячейки стрелками переходит к соседям по раскладке.
 */
export const StickerFeed: FC<StickerFeedProps> = (props) => {
  const {
    sections,
    layout,
    ranges,
    activeId,
    scrollRef,
    onScroll,
    onCellDelete,
    onPackDelete,
    onRecentClear,
  } = props;
  const navigate = useStickerNavigator(layout, scrollRef);
  const byId = new Map<string, FeedSection>();

  for (const section of sections) byId.set(section.id, section);

  const handleFeedScroll = () => {
    onScroll();
  };

  /**
   * Ключ ряда — его номер в раскладке, а ряды всех диапазонов лежат одним списком детей: ряд,
   * заранее смонтированный в окне точки перехода, после перехода остаётся тем же узлом со своими
   * декодированными картинками. Вложенный массив на диапазон Preact обернул бы во фрагмент, и
   * ключи сверялись бы только внутри фрагмента.
   */
  const renderRange = (rows: StickerRow<FeedSticker>[], [from, to]: RowRange) => {
    return rows.slice(from, to).map((row, offset) => {
      const { kind, sectionId, top, height } = row;
      const { title = '', hint = '', pack = null } = byId.get(sectionId) || {};

      const handleCellDelete = (cell: FeedSticker) => {
        onCellDelete(sectionId, cell);
      };

      switch (kind) {
        case 'header': {
          return (
            <SectionHeader
              key={from + offset}
              sectionId={sectionId}
              title={title}
              link={pack ? packLink(pack) : null}
              top={top}
              height={height}
              onPackDelete={onPackDelete}
              onRecentClear={onRecentClear}
            />
          );
        }

        case 'cells': {
          return (
            <FeedRow
              key={from + offset}
              row={row}
              hint={hint}
              onCellDelete={handleCellDelete}
            />
          );
        }

        default: {
          const unknownKind: never = kind;

          throw new Error(`Unknown sticker row: ${String(unknownKind)}`);
        }
      }
    });
  };

  return (
    <div
      ref={scrollRef}
      role="tabpanel"
      id={FEED_PANEL_ID}
      aria-labelledby={activeId ? sectionTabId(activeId) : undefined}
      className={FEED_CLASS}
      onScroll={handleFeedScroll}
    >
      <PreviewNavigationContext.Provider value={navigate}>
        <div className="relative" style={{ height: layout?.total || 0 }}>
          {layout &&
            ranges.flatMap((range) => {
              return renderRange(layout.rows, range);
            })}
        </div>
      </PreviewNavigationContext.Provider>
    </div>
  );
};
