import type { FunctionComponent as FC } from 'preact';

import type { CellRemoveKind } from '../../Menu/CellMenu/CellMenu.types';
import { usePicker } from '../../PickerProvider/usePicker';
import { StickerCell } from '../../StickerCell/StickerCell';
import type { StickerCellRemove } from '../../StickerCell/StickerCell.types';
import { COLUMNS, GAP } from '../../stickerLayout/stickerLayout';
import { FAVORITE_SECTION_ID, RECENT_SECTION_ID } from '../../usePickerView/sectionIds';
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

/**
 * Вид удаления в меню ячейки по разделу ряда. У «Избранного» удаления нет: элемент оттуда убирает
 * пункт избранного, а «Удалить стикер» удалил бы стикер из пака, хотя в избранном он остался бы
 * снимком.
 *
 * @param sectionId — id раздела ряда
 * @returns вид удаления; `null` — удаления нет
 */
const removeKindOf = (sectionId: string): CellRemoveKind | null => {
  switch (sectionId) {
    case FAVORITE_SECTION_ID: {
      return null;
    }

    case RECENT_SECTION_ID: {
      return 'recent';
    }

    default: {
      return 'sticker';
    }
  }
};

const HINT_CLASS =
  'absolute inset-x-0 flex items-center justify-center px-4 text-center leading-normal text-cadetGray-30 dark:text-gray-70';

/**
 * Ряд ячеек ленты стикеров, абсолютно поставленный по своей геометрии: до пяти ячеек или
 * подсказка пустого раздела. Плитка «Создать стикер» — последний слот ряда с `hasCreateTile`, в
 * пустых «Моих стикерах» — вместо подсказки. Object URL стикера создаётся здесь — только для
 * ячеек в окне ленты, по `urlKey` ячейки.
 */
export const FeedRow: FC<FeedRowProps> = (props) => {
  const { row, hint, onCellDelete, onFavoriteToggle } = props;
  const { urlOf } = usePicker();
  const { sectionId, top, height, items, hasCreateTile } = row;
  const removeKind = removeKindOf(sectionId);

  /**
   * У разделов паков id раздела — id пака. «Недавние» и «Избранное» пака не передают: отправка
   * оттуда использованием пака не считается.
   */
  const packId =
    sectionId === RECENT_SECTION_ID || sectionId === FAVORITE_SECTION_ID
      ? undefined
      : sectionId;
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
        const { key, item, sticker, urlKey, name } = cell;

        const handleCellRemove = () => {
          onCellDelete(cell);
        };

        const removal: StickerCellRemove = removeKind
          ? { removeKind, onRemove: handleCellRemove }
          : {};

        const handleFavoriteToggle = () => {
          onFavoriteToggle({ sectionId, cellKey: key, item, sticker });
        };

        return (
          <StickerCell
            key={key}
            id={cellId(sectionId, key)}
            item={item}
            packId={packId}
            url={urlOf(urlKey, sticker.blob)}
            emoji={sticker.emoji}
            name={name}
            {...removal}
            onFavoriteToggle={handleFavoriteToggle}
          />
        );
      })}

      {hasCreateTile && <CreateTile />}
    </div>
  );
};
