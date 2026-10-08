import { useContext } from 'preact/hooks';

import { PreviewContext } from './PreviewContext';
import type { PreviewContextValue } from './PreviewProvider.types';

/**
 * Состояние предпросмотра стикера или GIF, шаг, закрытие и конец ухода — для оверлея. Значение
 * меняется с каждым изменением предпросмотра; ячейкам — `usePreviewActions`.
 *
 * @returns состояние и методы слоя `PreviewProvider`
 */
export const usePreview = (): PreviewContextValue => {
  const value = useContext(PreviewContext);

  if (!value) throw new Error('usePreview вызван вне PreviewProvider');

  return value;
};
