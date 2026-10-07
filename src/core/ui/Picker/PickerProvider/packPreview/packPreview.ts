import type { TgStickerSet } from '../../../../sources/telegram.types';

import type { PackPreview } from './packPreview.types';

/**
 * Кэш состава паков и номер запроса превью без состояния Preact: провайдер держит один экземпляр
 * до перезагрузки страницы.
 *
 * Кэшируется промис, а не набор: импорт, запущенный до ответа превью, ждёт тот же запрос.
 * Отклонённый промис из кэша удаляется — повтор после сбоя сети или отказа бота делает новый
 * запрос, а не получает тот же отказ.
 *
 * @returns кэш и номер запроса
 */
export const createPackPreview = (): PackPreview => {
  const sets = new Map<string, Promise<TgStickerSet>>();
  let lastRequest = 0;

  return {
    load: (name, resolve) => {
      const cached = sets.get(name);

      if (cached) return cached;
      const request = resolve(name);

      sets.set(name, request);
      request.catch(() => {
        if (sets.get(name) === request) sets.delete(name);
      });

      return request;
    },
    begin: () => {
      lastRequest += 1;

      return lastRequest;
    },
    isCurrent: (request) => {
      return request === lastRequest;
    },
  };
};
