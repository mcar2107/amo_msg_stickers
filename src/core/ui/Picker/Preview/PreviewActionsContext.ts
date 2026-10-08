import { createContext } from 'preact';

import type { PreviewActions } from './PreviewProvider.types';

/**
 * `null` — значение вне `PreviewProvider`: `usePreviewActions` превращает его в исключение.
 */
export const PreviewActionsContext = createContext<PreviewActions | null>(null);
