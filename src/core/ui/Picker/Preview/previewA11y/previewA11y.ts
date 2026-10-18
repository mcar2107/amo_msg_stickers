import type { PreviewMode } from '@ui/Preview';

import type {
  PreviewAttributes,
  PreviewCloseReason,
  PreviewFocusSource,
} from './previewA11y.types';

/**
 * Атрибуты корня оверлея. Закреплённый предпросмотр открыт осознанно и переносит фокус, поэтому
 * это диалог с именем; предпросмотр удержания — жест мыши, скринридеру его не объявляют.
 *
 * @param mode — способ открытия
 * @param name — имя для скринридера
 * @returns атрибуты корня
 */
export const previewAttributes = (mode: PreviewMode, name: string): PreviewAttributes => {
  switch (mode) {
    case 'pinned': {
      return { role: 'dialog', 'aria-label': name };
    }

    case 'hold': {
      return { 'aria-hidden': 'true' };
    }

    default: {
      const unknownMode: never = mode;

      throw new Error(`Unknown preview mode: ${String(unknownMode)}`);
    }
  }
};

/**
 * Возвращать ли фокус на источник при закрытии. Escape, клик и кнопка возвращают, пока источник
 * в документе; уход фокуса не возвращает — он уже там, куда его перевели.
 *
 * @param reason — чем закрыт предпросмотр
 * @param source — источник предпросмотра
 * @returns нужно ли ставить фокус на источник
 */
export const shouldReturnFocus = (
  reason: PreviewCloseReason,
  source: PreviewFocusSource
): boolean => {
  switch (reason) {
    case 'escape':

    case 'click': {
      return source.isConnected;
    }

    case 'focusout': {
      return false;
    }

    default: {
      const unknownReason: never = reason;

      throw new Error(`Unknown preview close reason: ${String(unknownReason)}`);
    }
  }
};
