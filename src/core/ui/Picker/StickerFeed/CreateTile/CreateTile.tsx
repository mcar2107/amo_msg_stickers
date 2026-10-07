import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';
import { PlusIcon } from '../../PlusIcon/PlusIcon';
import { usePickerView } from '../../usePickerView/usePickerView';

/**
 * Без наведения плитка не спорит со стикерами: приглушённые пунктирная рамка и «+», без подложки. Подложка
 * наведения — как у ячейки стикера, рамка и знак при ней — в полный цвет. Скругление и размер — как у
 * `StickerCell`: плитка занимает слот сетки наравне со стикером.
 */
const TILE_CLASS = [
  'flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg border border-dashed bg-transparent',
  'border-cadetGray-30/[.4] text-cadetGray-30/[.6] dark:border-white-0/[.2] dark:text-white-0/[.4]',
  'motion-safe:transition-colors duration-base',
  'hover:border-cadetGray-30 hover:bg-cadetGray-30/[.14] hover:text-cadetGray-30',
  'focus-visible:border-cadetGray-30 focus-visible:bg-cadetGray-30/[.14] focus-visible:text-cadetGray-30',
  'dark:hover:border-white-0 dark:hover:bg-white-0/[.07] dark:hover:text-white-0',
  'dark:focus-visible:border-white-0 dark:focus-visible:bg-white-0/[.07] dark:focus-visible:text-white-0',
].join(' ');

/**
 * Плитка «Создать стикер» в конце «Моих стикеров»: открывает экран «Добавить стикеры» на
 * сегменте «Свой стикер» — плитка лежит в разделе своих стикеров.
 *
 * Плитка — не стикер: контекстного меню, отправки и недавних у неё нет, поэтому это обычная кнопка, а не
 * `StickerCell`. Текста в клетке нет — подпись в 64 px мельчила бы и тянула взгляд сильнее знака; назначение
 * объясняют `title` и `aria-label`.
 */
export const CreateTile: FC = () => {
  const { openScreen } = usePickerView();
  const title = t('add.createTile');

  const handleTileClick = () => {
    openScreen('add', 'custom');
  };

  return (
    <button
      type="button"
      className={TILE_CLASS}
      aria-label={title}
      title={title}
      onClick={handleTileClick}
    >
      <PlusIcon />
    </button>
  );
};
