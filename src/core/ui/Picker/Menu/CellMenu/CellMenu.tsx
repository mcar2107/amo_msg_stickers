import type { FunctionComponent as FC } from 'preact';

import { Menu } from '@ui/Menu';

import type { CellMenuProps } from './CellMenu.types';
import { cellMenuItems } from './cellMenuItems';
import { FavoriteItem } from './FavoriteItem';
import { PreviewItem } from './PreviewItem';
import { RemoveItem } from './RemoveItem';

/**
 * Контекстное меню ячейки стикера или GIF: «Предпросмотр» первым, пункт избранного вторым, затем
 * удаление, если оно у ячейки есть. Удаление живёт только здесь: кнопки удаления на ячейках
 * заслоняли бы сетку.
 */
export const CellMenu: FC<CellMenuProps> = (props) => {
  const {
    label,
    kind,
    favoriteItem,
    opening,
    onClose,
    onPreview,
    onFavoriteToggle,
    onRemove,
  } = props;
  const { anchor, source } = opening;

  return (
    <Menu label={label} anchor={anchor} source={source} onClose={onClose}>
      {cellMenuItems(kind).map((item) => {
        switch (item) {
          case 'preview': {
            return <PreviewItem key={item} onPreview={onPreview} />;
          }

          case 'favorite': {
            return (
              <FavoriteItem key={item} item={favoriteItem} onToggle={onFavoriteToggle} />
            );
          }

          case 'remove': {
            if (!kind) return null;

            return <RemoveItem key={item} kind={kind} onRemove={onRemove} />;
          }

          default: {
            const unknownItem: never = item;

            throw new Error(`Unknown cell menu item: ${String(unknownItem)}`);
          }
        }
      })}
    </Menu>
  );
};
