import { useContext } from 'preact/hooks';

import { PreviewNavigationContext } from '../Preview/PreviewNavigationContext';
import { usePreviewActions } from '../Preview/usePreviewActions';
import { usePressPreview } from '../usePressPreview/usePressPreview';

import type { CellPreview, UseCellPreviewOptions } from './useCellPreview.types';

/**
 * Предпросмотр ячейки стикера или GIF: удержание кнопки мыши (`usePressPreview`) с открытием и
 * переключением предпросмотра по её цели и закреплённое открытие из меню. Одна обвязка на обе
 * ячейки: стикер и GIF отличаются только целью.
 *
 * Закреплённый предпросмотр получает навигатор ленты, в которой лежит ячейка, — его стрелки
 * переключают на соседей. Ячейка вне ленты навигатора не получает.
 *
 * @param options — цель предпросмотра и признак занятой ячейки
 * @returns методы удержания и закреплённое открытие
 */
export const useCellPreview = (options: UseCellPreviewOptions): CellPreview => {
  const { target, isBusy } = options;
  const { openHold, swapHold, openPinned } = usePreviewActions();
  const navigate = useContext(PreviewNavigationContext);

  const handleCellHold = (source: HTMLElement) => {
    openHold(target, source);
  };

  const handleCellSwap = (source: HTMLElement) => {
    swapHold(target, source);
  };

  const press = usePressPreview({
    isDisabled: isBusy,
    onHold: handleCellHold,
    onSwap: handleCellSwap,
  });

  const openCellPinned = (source: HTMLElement) => {
    openPinned(target, source, navigate);
  };

  return { ...press, openPinned: openCellPinned };
};
