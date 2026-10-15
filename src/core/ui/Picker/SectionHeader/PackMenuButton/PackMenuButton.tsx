import type { FunctionComponent as FC, TargetedMouseEvent } from 'preact';
import { useState } from 'preact/hooks';

import { t } from '../../../../i18n/translate';
import { Menu } from '../../Menu/Menu';
import type { MenuOpening } from '../../Menu/Menu.types';
import { CopyPackLinkItem } from '../CopyPackLinkItem/CopyPackLinkItem';
import { DeletePackItem } from '../DeletePackItem/DeletePackItem';
import { ExportPackItem } from '../ExportPackItem/ExportPackItem';

import type { PackMenuButtonProps } from './PackMenuButton.types';

const MORE_CLASS = [
  'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent p-0',
  'text-cadetGray-30 transition-colors duration-base hover:bg-cadetGray-30/[.14]',
  'dark:text-gray-70 dark:hover:bg-white-0/[.07]',
].join(' ');

/**
 * Кнопка «…» заголовка пака и его меню. Меню открывается под кнопкой, повторное нажатие его
 * закрывает. Пункты — в порядке «Копировать ссылку», «Выгрузить пак», «Удалить пак»; пункта, которого у пака нет,
 * в меню нет.
 */
export const PackMenuButton: FC<PackMenuButtonProps> = (props) => {
  const { packId, title, link, hasStickers, onDelete } = props;
  const [opening, setOpening] = useState<MenuOpening | null>(null);
  const label = t('pack.menu', { title });

  const handleMoreClick = (event: TargetedMouseEvent<HTMLButtonElement>) => {
    const { currentTarget } = event;

    if (opening) {
      setOpening(null);

      return;
    }

    const { left, top, right, bottom } = currentTarget.getBoundingClientRect();

    setOpening({ anchor: { left, top, right, bottom }, source: currentTarget });
  };

  const handleMenuClose = () => {
    setOpening(null);
  };

  const handleDeleteConfirm = () => {
    onDelete?.();
  };

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={opening !== null}
        className={MORE_CLASS}
        onClick={handleMoreClick}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current">
          <circle cx="3" cy="8" r="1.5" />

          <circle cx="8" cy="8" r="1.5" />

          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </button>

      {opening && (
        <Menu
          label={label}
          anchor={opening.anchor}
          source={opening.source}
          onClose={handleMenuClose}
        >
          {link && <CopyPackLinkItem link={link} />}

          {hasStickers && <ExportPackItem packId={packId} title={title} />}

          {onDelete && <DeletePackItem onConfirm={handleDeleteConfirm} />}
        </Menu>
      )}
    </>
  );
};
