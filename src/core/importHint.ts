import type { HintStorage } from './importHint.types';

export const HINT_SEEN_KEY = 'amo-stickers:import-hint-seen';

/**
 * Значение признака: любое другое значение под ключом считается «не видел».
 */
const SEEN = '1';

/**
 * Сбой чтения — «не видел»: лишний раз раскрытая инструкция безвредна, а свёрнутая у того,
 * кто её не видел, прячет, где взять ссылку на пак.
 *
 * @param storage — хранилище страницы
 * @returns `true` — инструкция уже показывалась; `false` — нет признака или хранилище
 * недоступно
 */
export const readHintSeen = (storage: HintStorage): boolean => {
  try {
    return storage.getItem(HINT_SEEN_KEY) === SEEN;
  } catch {
    return false;
  }
};

/**
 * Признак — удобство интерфейса: незаписанный лишь раскроет инструкцию ещё раз, поэтому
 * сбой записи не выходит наружу.
 *
 * @param storage — хранилище страницы
 */
export const writeHintSeen = (storage: HintStorage) => {
  try {
    storage.setItem(HINT_SEEN_KEY, SEEN);
  } catch {
    /**
     * Хранилище недоступно — инструкция будет раскрыта при следующем показе.
     */
  }
};
