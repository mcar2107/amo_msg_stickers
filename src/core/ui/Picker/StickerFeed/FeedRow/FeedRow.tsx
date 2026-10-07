import type { FunctionComponent as FC } from 'preact';

import type { CellRemoveKind } from '../../Menu/CellMenu/CellMenu.types';
import { usePicker } from '../../PickerProvider/usePicker';
import { StickerCell } from '../../StickerCell/StickerCell';
import { COLUMNS, GAP } from '../../stickerLayout/stickerLayout';
import { RECENT_SECTION_ID } from '../../usePickerView/sectionIds';
import { cellId } from '../cellId';
import { CreateTile } from '../CreateTile/CreateTile';

import type { FeedRowProps } from './FeedRow.types';

/**
 * Колонки и зазор сетки — из констант раскладки, а не классами Tailwind: геометрия ряда уже
 * посчитана ими, и сетка должна совпасть с ней до пикселя.
 */
const GRID_STYLE = {
  gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
  columnGap: GAP,
};

const HINT_CLASS =
  'absolute inset-x-0 flex items-center justify-center px-4 text-center leading-normal text-cadetGray-30 dark:text-gray-70';

/**
 * Ряд ячеек ленты стикеров, абсолютно поставленный по своей геометрии: до пяти ячеек или
 * подсказка пустого раздела. Плитка «Создать стикер» — последний слот ряда с `hasCreateTile`, в
 * пустых «Моих стикерах» — вместо подсказки. Object URL стикера создаётся здесь — только для
 * ячеек в окне ленты.
 */
export const FeedRow: FC<FeedRowProps> = (props) => {
  const { row, hint, onCellDelete } = props;
  const { urlOf } = usePicker();
  const { sectionId, top, height, items, hasCreateTile } = row;
  const isRecent = sectionId === RECENT_SECTION_ID;
  const removeKind: CellRemoveKind = isRecent ? 'recent' : 'sticker';

  /**
   * У разделов паков id раздела — id пака. «Недавние» пака не передают: отправка оттуда
   * использованием пака не считается.
   */
  const packId = isRecent ? undefined : sectionId;
  const position = { top, height };

  if (!items.length && !hasCreateTile) {
    return (
      <div className={HINT_CLASS} style={position}>
        {hint}
      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 grid" style={{ ...position, ...GRID_STYLE }}>
      {items.map((cell) => {
        const { key, item, sticker, name } = cell;

        const handleCellRemove = () => {
          onCellDelete(cell);
        };

        return (
          <StickerCell
            key={key}
            id={cellId(sectionId, key)}
            item={item}
            packId={packId}
            url={urlOf(sticker.id, sticker.blob)}
            emoji={sticker.emoji}
            name={name}
            removeKind={removeKind}
            onRemove={handleCellRemove}
          />
        );
      })}

      {hasCreateTile && <CreateTile />}
    </div>
  );
};
