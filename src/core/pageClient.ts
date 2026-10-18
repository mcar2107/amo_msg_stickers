import {
  PAGE_FILE_ATTR,
  PAGE_REQUEST_EVENT,
  PAGE_RESPONSE_EVENT,
  PAGE_TARGET_ATTR,
  parsePageResponse,
  toPageEvent,
} from '@shared/pageBridge';
import type { PageDims, PageResponse } from '@shared/pageBridge.types';

import { uid } from './db';
import type {
  ClientDocument,
  FileNode,
  MarkableNode,
  PageClient,
  PageSendResult,
} from './pageClient.types';

const toResult = (response: PageResponse | null): PageSendResult => {
  if (!response) return { status: 'unavailable', reason: 'no-agent' };

  switch (response.status) {
    case 'accepted': {
      return { status: 'accepted' };
    }

    case 'rejected': {
      return { status: 'unavailable', reason: response.reason };
    }

    default: {
      const unknownResponse: never = response;

      throw new Error(`Unknown page response: ${JSON.stringify(unknownResponse)}`);
    }
  }
};

/**
 * Клиент агента в мире страницы: команда — событием, поле ввода и файл — узлами DOM с
 * пометкой `id` команды.
 *
 * Агент отвечает синхронно, внутри `dispatchEvent`, поэтому ждать нечего: нет ответа к
 * возврату из `dispatchEvent` — агента нет, и отправка сразу уходит запасным путём. Пометки
 * и `<input>` снимаются тут же: файл дальше держит amo. `<input>` кладётся в
 * `documentElement`, а не в `body`: за `body` следят `MutationObserver` ядра и amo, и узел
 * на время команды запускал бы у них лишний проход.
 *
 * @param doc — документ страницы
 * @param fileNodeOf — создаёт скрытый `<input type="file">` с файлом
 * @returns клиент
 */
export const createPageClient = <N extends FileNode>(
  doc: ClientDocument<N>,
  fileNodeOf: (file: File) => N
): PageClient => {
  const send = (editable: MarkableNode, file: File, dims: PageDims): PageSendResult => {
    const id = uid();
    const input = fileNodeOf(file);
    let response: PageResponse | null = null;

    /**
     * Засчитывается первый ответ с нужным `id` и валидной формой: остальное на странице —
     * чужие события.
     */
    const handleResponse = (event: Event) => {
      const parsed = parsePageResponse(event);

      if (!response && parsed?.id === id) response = parsed;
    };

    doc.addEventListener(PAGE_RESPONSE_EVENT, handleResponse);
    editable.setAttribute(PAGE_TARGET_ATTR, id);
    input.setAttribute(PAGE_FILE_ATTR, id);
    doc.documentElement.append(input);

    try {
      doc.dispatchEvent(toPageEvent(PAGE_REQUEST_EVENT, { id, op: 'send', dims }));
    } finally {
      doc.removeEventListener(PAGE_RESPONSE_EVENT, handleResponse);
      editable.removeAttribute(PAGE_TARGET_ATTR);
      input.remove();
    }

    return toResult(response);
  };

  return { send };
};

/**
 * `<input>` с файлом: `files` задаётся через `DataTransfer`, другого способа положить
 * файл в поле выбора у DOM нет. Узел скрыт и в раскладку amo не попадает.
 *
 * @param file — отправляемый файл
 * @returns скрытый `<input type="file">`
 */
export const fileInputOf = (file: File) => {
  const input = document.createElement('input');
  const transfer = new DataTransfer();

  input.type = 'file';
  input.hidden = true;
  transfer.items.add(file);
  input.files = transfer.files;

  return input;
};
