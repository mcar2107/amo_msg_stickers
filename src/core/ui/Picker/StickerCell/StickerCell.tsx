import type {
  FunctionComponent as FC,
  TargetedKeyboardEvent,
  TargetedMouseEvent,
  TargetedPointerEvent,
} from 'preact';

import { CellSpinner } from '../CellSpinner/CellSpinner';
import { CellMenu } from '../Menu/CellMenu/CellMenu';
import { isMenuKey } from '../Menu/menuKey/menuKey';
import { useContextMenu } from '../Menu/useContextMenu/useContextMenu';
import { stickerPreviewTarget } from '../Preview/previewTarget/previewTarget';
import { useCellPreview } from '../useCellPreview/useCellPreview';
import { useCellSend } from '../useCellSend/useCellSend';

import type { StickerCellProps } from './StickerCell.types';

/**
 * Занятая отправкой ячейка — `disabled`: не принимает клики до конца отправки, картинка
 * приглушена, а индикатор поверх неё — нет.
 *
 * `select-none`: удержание с дрожанием курсора не начинает выделение текста страницы под
 * пикером.
 */
const CELL_CLASS = [
  'group relative select-none flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg bg-transparent p-1',
  'transition-colors duration-base hover:bg-cadetGray-30/[.14] dark:hover:bg-white-0/[.07]',
  'disabled:pointer-events-none',
].join(' ');

/**
 * Ячейка стикера: отправка нажатием, предпросмотр — удержанием кнопки мыши или пунктом
 * контекстного меню, удаление — пунктом контекстного меню.
 *
 * Меню стоит рядом с кнопкой, а не внутри: кнопка внутри кнопки — невалидный HTML. В сетке
 * ряда оно места не занимает — у него `position: fixed`.
 *
 * `aria-haspopup` у кнопки нет: скринридер объявил бы её кнопкой меню, а Enter и пробел
 * отправляют стикер — меню открывают только правый клик, клавиша меню и `Shift+F10`.
 */
export const StickerCell: FC<StickerCellProps> = (props) => {
  const { id, item, packId, url, emoji, name, removeKind, onRemove } = props;
  const target = stickerPreviewTarget(url, emoji, name);
  const { isBusy, sendItem } = useCellSend(item, packId);
  const { opening, open, close } = useContextMenu();
  const preview = useCellPreview({ target, isBusy });

  const handleSendClick = () => {
    void sendItem();
  };

  const handleSendContextMenu = (event: TargetedMouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY, currentTarget } = event;

    event.preventDefault();
    open({ left: clientX, top: clientY }, currentTarget);
  };

  const handleSendKeyDown = (event: TargetedKeyboardEvent<HTMLButtonElement>) => {
    if (!isMenuKey(event)) return;

    event.preventDefault();
    open(null, event.currentTarget);
  };

  const handleMenuClose = () => {
    close();
  };

  const handleSendPointerDown = (event: TargetedPointerEvent<HTMLButtonElement>) => {
    const { button, pointerType, ctrlKey, clientX, clientY, currentTarget } = event;

    preview.start(
      { button, pointerType, isCtrlPressed: ctrlKey, x: clientX, y: clientY },
      currentTarget
    );
  };

  const handleSendPointerEnter = (event: TargetedPointerEvent<HTMLButtonElement>) => {
    const { pointerType, buttons, currentTarget } = event;

    preview.enter({ pointerType, buttons }, currentTarget);
  };

  const handleSendPointerMove = (event: TargetedPointerEvent<HTMLButtonElement>) => {
    preview.move(event.clientX, event.clientY);
  };

  /**
   * Отпускание, уход с ячейки и отмена жеста браузером одинаково останавливают отсчёт.
   */
  const handleSendPointerEnd = () => {
    preview.cancel();
  };

  const handleMenuPreview = () => {
    if (opening) preview.openPinned(opening.source);
  };

  const handleItemRemove = () => {
    onRemove(item);
  };

  return (
    <>
      <button
        type="button"
        id={id}
        aria-label={name.send}
        aria-busy={isBusy}
        disabled={isBusy}
        className={CELL_CLASS}
        onClick={handleSendClick}
        onContextMenu={handleSendContextMenu}
        onKeyDown={handleSendKeyDown}
        onPointerDown={handleSendPointerDown}
        onPointerEnter={handleSendPointerEnter}
        onPointerMove={handleSendPointerMove}
        onPointerLeave={handleSendPointerEnd}
        onPointerUp={handleSendPointerEnd}
        onPointerCancel={handleSendPointerEnd}
      >
        {/*
         * Без `loading="lazy"`: лента стикеров декодирует картинки окна заранее, до прыжка к
         * далёкому разделу, а ленивая картинка далеко за видимой областью не грузится.
         */}
        <img
          src={url}
          alt=""
          className="pointer-events-none block max-h-full max-w-full object-contain group-disabled:opacity-40"
        />

        {isBusy && <CellSpinner />}
      </button>

      {opening && (
        <CellMenu
          key={opening.seq}
          label={name.menu}
          kind={removeKind}
          opening={opening}
          onClose={handleMenuClose}
          onPreview={handleMenuPreview}
          onRemove={handleItemRemove}
        />
      )}
    </>
  );
};
