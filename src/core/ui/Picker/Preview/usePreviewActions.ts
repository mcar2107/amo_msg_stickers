import { useContext } from 'preact/hooks';

import { PreviewActionsContext } from './PreviewActionsContext';
import type { PreviewActions } from './PreviewProvider.types';

/**
 * Открытие предпросмотра из ячейки: на время удержания, переключение удержания и закреплённое
 * открытие. Значение стабильно, и ячейки не перерисовываются, когда меняется сам предпросмотр.
 *
 * @returns методы открытия `PreviewProvider`
 */
export const usePreviewActions = (): PreviewActions => {
  const value = useContext(PreviewActionsContext);

  if (!value) throw new Error('usePreviewActions вызван вне PreviewProvider');

  return value;
};
