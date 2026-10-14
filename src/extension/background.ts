import { fetchChecked, readJson, readResponseLimited } from '../core/net';

import { actionIconPaths, isIconThemeMessage } from './actionIcon';
import { toFailureResponse } from './fetchResponse';
import type { FetchRequest, FetchResponse, IconThemeMessage } from './messages.types';

/**
 * Сеть идёт через service worker: у него host_permissions и нет CORS-ограничений страницы.
 *
 * Сообщения между SW и content script сериализуются в JSON, поэтому бинарь — base64.
 */

/**
 * Байты склеиваем кусками: `String.fromCharCode(...bytes)` на всём буфере упрётся в лимит
 * числа аргументов функции.
 */
const BASE64_CHUNK_SIZE = 0x80_00;

const toBase64 = (bytes: Uint8Array) => {
  let bin = '';

  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    bin += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_SIZE));
  }

  return btoa(bin);
};

const readBody = async (res: Response, request: FetchRequest): Promise<FetchResponse> => {
  const { as: format } = request;

  switch (request.as) {
    case 'json': {
      return { ok: true, json: await readJson(res) };
    }

    case 'blob': {
      const bytes = await readResponseLimited(res, request.maxBytes);

      return {
        ok: true,
        base64: toBase64(bytes),
        mime: res.headers.get('content-type') || '',
      };
    }

    default: {
      request satisfies never;

      /**
       * Только формат, без запроса целиком: в `url` запроса к Telegram лежит токен бота.
       */
      throw new Error(`Неизвестный формат ответа: ${String(format)}`);
    }
  }
};

const handleFetch = async (request: FetchRequest): Promise<FetchResponse> => {
  try {
    return await readBody(await fetchChecked(request.url), request);
  } catch (error) {
    return toFailureResponse(error);
  }
};

/**
 * Без `externally_connectable` сюда и так приходят только контексты расширения, но
 * отвечаем лишь его content script-ам: других потребителей сети у SW нет, и новая страница
 * расширения не получит сеть в обход этой проверки случайно.
 *
 * @param sender — отправитель сообщения
 * @returns true, если сообщение от content script этого расширения
 */
const isOwnContentScript = ({ id, tab }: chrome.runtime.MessageSender) => {
  return id === chrome.runtime.id && Boolean(tab);
};

const respond = async (
  msg: FetchRequest,
  sendResponse: (response: FetchResponse) => void
) => {
  sendResponse(await handleFetch(msg));
};

/**
 * Тема браузера известна только странице (`prefers-color-scheme`): у service worker нет
 * `matchMedia`. Иконка ставится на все вкладки сразу — тема у браузера одна.
 */
const setActionIcon = async (isDark: boolean) => {
  try {
    await chrome.action.setIcon({ path: actionIconPaths(isDark) });
  } catch (error) {
    console.warn('[amo-stickers] action icon update failed', error);
  }
};

/**
 * Слушатель синхронный: `true` держит канал открытым до асинхронного `sendResponse`.
 */
chrome.runtime.onMessage.addListener(
  (msg: FetchRequest | IconThemeMessage, sender, sendResponse) => {
    if (isIconThemeMessage(msg) && isOwnContentScript(sender)) {
      void setActionIcon(msg.isDark);

      return false;
    }

    if (msg?.type !== 'amo-stickers:fetch' || !isOwnContentScript(sender)) return false;
    void respond(msg, sendResponse);

    return true;
  }
);
