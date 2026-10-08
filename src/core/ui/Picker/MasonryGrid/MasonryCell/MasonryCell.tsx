import type {
  FunctionComponent as FC,
  TargetedKeyboardEvent,
  TargetedMouseEvent,
  TargetedPointerEvent,
} from 'preact';

import type { SendItem } from '../../../../db.types';
import { gifCellName } from '../../cellName/cellName';
import { CellSpinner } from '../../CellSpinner/CellSpinner';
import { CellMenu } from '../../Menu/CellMenu/CellMenu';
import type { CellMenuRemove } from '../../Menu/CellMenu/CellMenu.types';
import { isMenuKey } from '../../Menu/menuKey/menuKey';
import { useContextMenu } from '../../Menu/useContextMenu/useContextMenu';
import { gifPreviewTarget } from '../../Preview/previewTarget/previewTarget';
import { useCellPreview } from '../../useCellPreview/useCellPreview';
import { useCellSend } from '../../useCellSend/useCellSend';

import type { MasonryCellProps } from './MasonryCell.types';

/**
 * Размер ячейки задан раскладкой до загрузки превью: иначе колонки перестраивались бы на
 * каждой загруженной картинке. Заливка поля ввода видна, пока превью грузится.
 *
 * Занятая отправкой ячейка — `disabled`: не принимает клики до конца отправки, превью
 * приглушено, а индикатор поверх него — нет.
 */
const CELL_CLASS = [
  'group absolute block select-none cursor-pointer overflow-hidden rounded-lg p-0',
  'bg-cadetGray-30/[.12] dark:bg-white-0/[.06] disabled:pointer-events-none',
].join(' ');

/**
 * Наведение — затемнение поверх превью: фон ячейки закрыт картинкой, и подсветить её фоном,
 * как стикер, нельзя.
 */
const HOVER_CLASS =
  'pointer-events-none absolute inset-0 bg-black-0/0 transition-colors duration-base group-hover:bg-black-0/[.12]';

/**
 * Ячейка GIF в ленте, абсолютно поставленная на место из раскладки. Контекстное меню есть у
 * любой GIF: у найденной в нём один «Предпросмотр», у недавней (есть `onRemove`) — ещё «Убрать
 * из недавних». Предпросмотр открывает и удержание кнопки мыши.
 *
 * Предпросмотр показывает версию для отправки (`gif.url`), а до её загрузки — превью ленты.
 *
 * `aria-haspopup` у кнопки нет: скринридер объявил бы её кнопкой меню, а Enter и пробел
 * отправляют GIF — меню открывают только правый клик, клавиша меню и `Shift+F10`.
 */
export const MasonryCell: FC<MasonryCellProps> = (props) => {
  const { id, gif, box, onRemove } = props;
  const { previewUrl } = gif;
  const item: SendItem = { kind: 'remote', gif };
  const name = gifCellName(gif);
  const { isBusy, sendItem } = useCellSend(item);
  const { opening, open, close } = useContextMenu();
  const preview = useCellPreview({ target: gifPreviewTarget(gif, name), isBusy });

  const handleCellClick = () => {
    void sendItem();
  };

  const handleCellContextMenu = (event: TargetedMouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY, currentTarget } = event;

    event.preventDefault();
    open({ left: clientX, top: clientY }, currentTarget);
  };

  const handleCellKeyDown = (event: TargetedKeyboardEvent<HTMLButtonElement>) => {
    if (!isMenuKey(event)) return;

    event.preventDefault();
    open(null, event.currentTarget);
  };

  const handleMenuClose = () => {
    close();
  };

  const handleCellPointerDown = (event: TargetedPointerEvent<HTMLButtonElement>) => {
    const { button, pointerType, ctrlKey, clientX, clientY, currentTarget } = event;

    preview.start(
      { button, pointerType, isCtrlPressed: ctrlKey, x: clientX, y: clientY },
      currentTarget
    );
  };

  const handleCellPointerEnter = (event: TargetedPointerEvent<HTMLButtonElement>) => {
    const { pointerType, buttons, currentTarget } = event;

    preview.enter({ pointerType, buttons }, currentTarget);
  };

  const handleCellPointerMove = (event: TargetedPointerEvent<HTMLButtonElement>) => {
    preview.move(event.clientX, event.clientY);
  };

  /**
   * Отпускание, уход с ячейки и отмена жеста браузером одинаково останавливают отсчёт.
   */
  const handleCellPointerEnd = () => {
    preview.cancel();
  };

  const handleMenuPreview = () => {
    if (opening) preview.openPinned(opening.source);
  };

  const handleItemRemove = () => {
    onRemove?.(gif);
  };

  /**
   * У найденной GIF удаления нет, у недавней — «Убрать из недавних»: `kind` и колбэк идут в меню
   * только вместе.
   */
  const removal: CellMenuRemove = onRemove
    ? { kind: 'recent', onRemove: handleItemRemove }
    : {};

  return (
    <>
      <button
        type="button"
        id={id}
        aria-label={name.send}
        aria-busy={isBusy}
        disabled={isBusy}
        className={CELL_CLASS}
        style={box}
        onClick={handleCellClick}
        onContextMenu={handleCellContextMenu}
        onKeyDown={handleCellKeyDown}
        onPointerDown={handleCellPointerDown}
        onPointerEnter={handleCellPointerEnter}
        onPointerMove={handleCellPointerMove}
        onPointerLeave={handleCellPointerEnd}
        onPointerUp={handleCellPointerEnd}
        onPointerCancel={handleCellPointerEnd}
      >
        <img
          src={previewUrl}
          alt=""
          loading="lazy"
          className="pointer-events-none block size-full object-cover group-disabled:opacity-40"
        />

        <span aria-hidden="true" className={HOVER_CLASS} />

        {isBusy && <CellSpinner />}
      </button>

      {opening && (
        <CellMenu
          key={opening.seq}
          label={name.menu}
          opening={opening}
          onClose={handleMenuClose}
          onPreview={handleMenuPreview}
          {...removal}
        />
      )}
    </>
  );
};
