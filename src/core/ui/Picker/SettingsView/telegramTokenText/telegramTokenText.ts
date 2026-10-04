import type { TelegramTokenText } from './telegramTokenText.types';

/**
 * Ключи подписи и подсказки поля токена Telegram-бота. Со встроенным токеном сборки свой
 * необязателен — импорт работает и без него; без встроенного токен нужен для импорта.
 * Ключи, а не текст: текст берётся `t` в рендере, на языке интерфейса.
 *
 * @param hasBuiltinToken — в сборке есть встроенный токен
 * @returns ключи словаря для поля токена
 */
export const telegramTokenText = (hasBuiltinToken: boolean): TelegramTokenText => {
  if (hasBuiltinToken) {
    return {
      label: 'settings.telegram.labelOptional',
      hint: 'settings.telegram.hintOptional',
    };
  }

  return { label: 'settings.telegram.label', hint: 'settings.telegram.hint' };
};
