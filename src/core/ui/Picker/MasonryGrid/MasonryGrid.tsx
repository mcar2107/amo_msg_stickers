import type { FunctionComponent as FC, TargetedEvent } from 'preact';
import { useMemo } from 'preact/hooks';

import type { RemoteGif } from '@core/db.types';
import { gifCells } from '@ui/keptScrollTop';
import { useKeptScroll } from '@ui/keptScrollTop/useKeptScroll';
import { PreviewNavigationContext } from '@ui/Preview';
import { useFeedEntry } from '@ui/useFeedEntry';

import { gifItemCellId, gifKey } from './gifCellId';
import { GridHeader } from './GridHeader';
import { MasonryCell } from './MasonryCell';
import type { MasonryGridProps } from './MasonryGrid.types';
import type { MasonrySection, MasonryTile } from './splitColumns';
import { splitColumns, visibleTiles } from './splitColumns';
import { COLUMN_COUNT, columnWidth, GRID_GAP, tileBox } from './tileBox';
import { useGridWindow } from './useGridWindow';
import { useMasonryNavigator } from './useMasonryNavigator';

/**
 * Отступы по бокам — у прокручиваемого элемента: ширина его содержимого, по которой считается
 * ширина колонки, уже без них и без полосы прокрутки. Полоса — `feed-scroll` из `picker.css`.
 */
const GRID_CLASS = 'feed-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2';

const SKELETON_CLASS = 'absolute rounded-lg bg-cadetGray-30/[.12] dark:bg-white-0/[.06]';

/**
 * Лента GIF в две колонки с сохранением пропорций: GIF разной формы, и квадратная сетка
 * обрезала бы их или оставляла пустоты.
 *
 * Ячейки лежат в документе в порядке выдачи и стоят абсолютно на местах из раскладки: порядок
 * Tab и скринридера совпадает с порядком выдачи, а не идёт колонка за колонкой. В документе
 * только плитки видимой области и по её высоте запаса сверху и снизу — GIF вне экрана не
 * декодируются и не проигрываются. Содержимое после ленты (подсказка, подпись источника) —
 * `children` под её плитками. Ячейки получают навигатор ленты: закреплённый предпросмотр ячейки
 * стрелками переходит к соседним плиткам по раскладке.
 */
export const MasonryGrid: FC<MasonryGridProps> = (props) => {
  const {
    sections,
    resetKey,
    keptScroll,
    children,
    onScroll,
    onRecentRemove,
    onFavoriteToggle,
    onRecentClear,
  } = props;
  const { scrollRef, width, viewport, scrollTop, trackScroll, syncScroll } =
    useGridWindow(resetKey);
  const column = columnWidth(width);

  useFeedEntry(scrollRef);

  const layout = useMemo(() => {
    if (!column) return null;

    const masonry = sections.map(
      ({ id, title, items, skeletons }): MasonrySection<RemoteGif> => {
        return { id, items, hasHeader: Boolean(title), skeletons };
      }
    );

    return splitColumns(masonry, { count: COLUMN_COUNT, width: column, gap: GRID_GAP });
  }, [sections, column]);

  const cells = useMemo(() => {
    return layout ? gifCells(layout.tiles) : null;
  }, [layout]);

  useKeptScroll({ kept: keptScroll, scrollRef, cells, syncScroll });

  const navigate = useMasonryNavigator(layout?.tiles || null, scrollRef);
  const tiles = layout ? visibleTiles(layout.tiles, scrollTop, viewport, viewport) : [];
  /**
   * Убрать и очистить можно только недавние: избранную GIF убирает пункт избранного, а выдача не
   * хранится.
   */
  const recentId = sections.find(({ kind }) => {
    return kind === 'recent';
  })?.id;

  const handleGridScroll = (event: TargetedEvent<HTMLDivElement>) => {
    trackScroll();
    onScroll(event.currentTarget);
  };

  const handleRecentRemove = (gif: RemoteGif) => {
    onRecentRemove(gif);
  };

  const handleRecentClear = () => {
    onRecentClear();
  };

  const renderTile = (tile: MasonryTile<RemoteGif>) => {
    const { kind, sectionId } = tile;

    switch (kind) {
      case 'item': {
        const { item } = tile;
        const key = gifKey(item);
        const isRecent = sectionId === recentId;

        const handleFavoriteToggle = () => {
          onFavoriteToggle({
            sectionId,
            cellKey: key,
            item: { kind: 'remote', gif: item },
          });
        };

        return (
          <MasonryCell
            key={`${sectionId}:${key}`}
            id={gifItemCellId(sectionId, item)}
            gif={item}
            box={tileBox(tile, column)}
            onRemove={isRecent ? handleRecentRemove : undefined}
            onFavoriteToggle={handleFavoriteToggle}
          />
        );
      }

      case 'header': {
        const { title = '' } =
          sections.find(({ id }) => {
            return id === sectionId;
          }) || {};

        return (
          <GridHeader
            key={`header:${sectionId}`}
            title={title}
            top={tile.top}
            height={tile.height}
            onClear={sectionId === recentId ? handleRecentClear : undefined}
          />
        );
      }

      case 'skeleton': {
        return (
          <div
            key={`skeleton:${sectionId}:${tile.index}`}
            aria-hidden="true"
            className={SKELETON_CLASS}
            style={tileBox(tile, column)}
          />
        );
      }

      default: {
        const unknownKind: never = kind;

        throw new Error(`Unknown masonry tile: ${String(unknownKind)}`);
      }
    }
  };

  return (
    <div ref={scrollRef} className={GRID_CLASS} onScroll={handleGridScroll}>
      <PreviewNavigationContext.Provider value={navigate}>
        <div className="relative" style={{ height: layout?.total || 0 }}>
          {tiles.map(renderTile)}
        </div>
      </PreviewNavigationContext.Provider>

      {children}
    </div>
  );
};
