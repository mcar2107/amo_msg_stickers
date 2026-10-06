import type { FunctionComponent as FC } from 'preact';

import { CellSpinner } from '../../../CellSpinner/CellSpinner';

import type { StickerPreviewProps } from './StickerPreview.types';

/**
 * Шахматка — из цвета фона поля ввода и прозрачных клеток: сквозь прозрачные пиксели
 * стикера видно клетку, а не сплошной фон панели. Минимальная высота держит место под
 * индикатор, пока первой картинки ещё нет.
 */
const BOARD_CLASS = [
  'relative flex min-h-16 justify-center rounded-lgx p-1.5 [background-size:16px_16px]',
  'bg-[repeating-conic-gradient(theme(colors.cadetGray.30/12%)_0_25%,transparent_0_50%)]',
  'dark:bg-[repeating-conic-gradient(theme(colors.white.0/6%)_0_25%,transparent_0_50%)]',
].join(' ');

/**
 * Превью своего стикера. Во время пересборки прежняя картинка остаётся под индикатором:
 * пустое место на время сборки дёргало бы раскладку формы. Занятость скринридеру объявляет
 * `aria-busy`, индикатор скрыт.
 */
export const StickerPreview: FC<StickerPreviewProps> = (props) => {
  const { url, isBusy } = props;

  return (
    <div className={BOARD_CLASS} aria-busy={isBusy}>
      {url && <img src={url} alt="" className="max-h-40 max-w-40" />}

      {isBusy && <CellSpinner />}
    </div>
  );
};
