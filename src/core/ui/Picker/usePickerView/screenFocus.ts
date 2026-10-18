import type { ScreenFocus } from './usePickerView.types';

/**
 * Id элемента-цели фокуса в теле экрана: его ставит сам элемент, а `useScreenFocus` ищет по нему. Id в закрытом shadow
 * root пикера уникальны в его дереве.
 */
export const SCREEN_FOCUS_ID: Record<ScreenFocus, string> = {
  libraryExport: 'settings-library-export',
};
