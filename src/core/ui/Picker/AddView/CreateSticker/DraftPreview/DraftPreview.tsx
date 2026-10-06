import type {
  FunctionComponent as FC,
  TargetedMouseEvent,
  TargetedPointerEvent,
} from 'preact';

import { t } from '../../../../../i18n/translate';
import { CellSpinner } from '../../../CellSpinner/CellSpinner';
import { useCellPreview } from '../../../useCellPreview/useCellPreview';

import type { DraftPreviewProps } from './DraftPreview.types';

/**
 * Шахматка — из цвета фона поля ввода и прозрачных клеток: сквозь прозрачные пиксели
 * стикера видно клетку, а не сплошной фон панели.
 *
 * `select-none`: удержание с дрожанием курсора не начинает выделение текста страницы под
 * пикером.
 */
const PREVIEW_CLASS = [
  'group relative flex size-full cursor-zoom-in select-none items-center justify-center',
  'rounded-lg p-1.5 [background-size:16px_16px] disabled:cursor-default',
  'bg-[repeating-conic-gradient(theme(colors.cadetGray.30/12%)_0_25%,transparent_0_50%)]',
  'dark:bg-[repeating-conic-gradient(theme(colors.white.0/6%)_0_25%,transparent_0_50%)]',
].join(' ');

/**
 * Значок лупы — подсказка глазу, что картинку можно увеличить; имя кнопки говорит то же
 * скринридеру.
 */
const ZOOM_BADGE_CLASS = [
  'pointer-events-none absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-md',
  'bg-white-0/90 text-cadetGray-10 shadow-[0_1px_3px] shadow-black-0/20 group-disabled:hidden',
  'dark:bg-gray-10/90 dark:text-gray-90',
].join(' ');

const ZOOM_ICON_PATH = [
  'M10.5 4a6.5 6.5 0 0 1 5.17 10.44l3.95 3.94a.9.9 0 1 1-1.28 1.28l-3.94-3.95A6.5 6.5 0 1 1 10.5',
  ' 4Zm0 1.8a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Z',
].join('');

/**
 * Превью собираемого стикера на всю зону загрузки: картинка вписана с сохранением пропорций и
 * растянута до размера зоны, мелкая — тоже. Предпросмотр — как у стикера в ленте:
 * удержание кнопки мыши показывает его, пока кнопку держат, а нажатие закрепляет — отправки у
 * черновика нет, и нажатию больше нечего делать.
 *
 * Во время пересборки прежняя картинка остаётся под индикатором: пустое место на время сборки
 * дёргало бы раскладку. Без картинки кнопка недоступна — увеличивать нечего.
 */
export const DraftPreview: FC<DraftPreviewProps> = (props) => {
  const { url, caption, isBusy } = props;
  const name = caption
    ? t('cell.sticker.previewCaption', { caption })
    : t('cell.sticker.preview');
  const preview = useCellPreview({ target: { url: url || '', name }, isBusy: !url });

  const handlePreviewClick = (event: TargetedMouseEvent<HTMLButtonElement>) => {
    preview.openPinned(event.currentTarget);
  };

  const handlePreviewPointerDown = (event: TargetedPointerEvent<HTMLButtonElement>) => {
    const { button, pointerType, ctrlKey, clientX, clientY, currentTarget } = event;

    preview.start(
      { button, pointerType, isCtrlPressed: ctrlKey, x: clientX, y: clientY },
      currentTarget
    );
  };

  const handlePreviewPointerMove = (event: TargetedPointerEvent<HTMLButtonElement>) => {
    preview.move(event.clientX, event.clientY);
  };

  /**
   * Отпускание, уход с превью и отмена жеста браузером одинаково останавливают отсчёт.
   */
  const handlePreviewPointerEnd = () => {
    preview.cancel();
  };

  return (
    <button
      type="button"
      aria-label={t('add.custom.zoom')}
      aria-busy={isBusy}
      disabled={!url}
      className={PREVIEW_CLASS}
      onClick={handlePreviewClick}
      onPointerDown={handlePreviewPointerDown}
      onPointerMove={handlePreviewPointerMove}
      onPointerLeave={handlePreviewPointerEnd}
      onPointerUp={handlePreviewPointerEnd}
      onPointerCancel={handlePreviewPointerEnd}
    >
      {url && (
        <img
          src={url}
          alt=""
          className="pointer-events-none block size-full object-contain"
        />
      )}

      <span aria-hidden="true" className={ZOOM_BADGE_CLASS}>
        <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
          <path d={ZOOM_ICON_PATH} />
        </svg>
      </span>

      {isBusy && <CellSpinner />}
    </button>
  );
};
