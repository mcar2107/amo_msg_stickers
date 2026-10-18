import { isObject } from '@shared/guards';

import type { IconThemeMessage } from './messages.types';

/**
 * Иконки кнопки расширения по теме браузера. Светлая — та же, что `action.default_icon` в
 * `manifest.json`: с ней кнопка стоит до первого сообщения о теме.
 */
export const ACTION_ICON_PATHS = {
  light: { 16: 'icons/icon16.png', 32: 'icons/icon32.png' },
  dark: { 16: 'icons/dark/icon16.png', 32: 'icons/dark/icon32.png' },
} as const;

/**
 * @param isDark — тёмная ли тема браузера
 * @returns пути иконок кнопки для `chrome.action.setIcon`
 */
export const actionIconPaths = (isDark: boolean) => {
  return isDark ? ACTION_ICON_PATHS.dark : ACTION_ICON_PATHS.light;
};

/**
 * Сообщение приходит из content script, но проверяется целиком: service worker не доверяет
 * форме сообщения, как и ответам сети.
 *
 * @param msg — входящее сообщение runtime
 * @returns true, если это сообщение о теме браузера
 */
export const isIconThemeMessage = (msg: unknown): msg is IconThemeMessage => {
  return (
    isObject(msg) &&
    'type' in msg &&
    msg.type === 'amo-stickers:icon-theme' &&
    'isDark' in msg &&
    typeof msg.isDark === 'boolean'
  );
};
