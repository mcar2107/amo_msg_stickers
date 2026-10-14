import { isDimension, isObject } from './guards';
import type {
  PageDims,
  PageRejectReason,
  PageRequest,
  PageResponse,
} from './pageBridge.types';

/**
 * Протокол ядра и агента в мире страницы. Внутренний путь отправки amo виден только
 * скриптам страницы, ядро живёт в изолированном мире, и общий у них только DOM: команда и
 * ответ идут `CustomEvent` на `document`, а файл и поле ввода — узлами, помеченными
 * атрибутом с `id` команды.
 *
 * `CustomEvent`, а не `postMessage`: его не слышат другие фреймы. `detail` — JSON-строка, а
 * не объект: объект из content-мира Firefox страница без `cloneInto` не прочтёт.
 */

export const PAGE_REQUEST_EVENT = 'amo-stickers:page-request';
export const PAGE_RESPONSE_EVENT = 'amo-stickers:page-response';

/**
 * Атрибут поля ввода, от которого агент ищет провайдер amo.
 */
export const PAGE_TARGET_ATTR = 'data-amo-stickers-target';

/**
 * Атрибут скрытого `<input type="file">` с отправляемым файлом.
 */
export const PAGE_FILE_ATTR = 'data-amo-stickers-file';

/**
 * Причины отказа агента: закрытый список — ответ с другой причиной ядро не примет.
 *
 * - `no-target` / `no-file` — нет узла, помеченного этой командой;
 * - `no-client` — у поля ввода не нашёлся `{ reduxStore, sendRequest }` amo;
 * - `no-conversation` — открыт не чат, или его нет в `state.dialogs`, или у записи нет типа;
 * - `unsupported-conversation` — тип чата, для которого amo не соберёт запрос;
 * - `build-threw` — чтение состояния amo или сборка сообщения бросили исключение;
 * - `send-threw` — `sendRequest` бросил до постановки в очередь;
 * - `draft-busy` — в черновике Worker-версии amo web есть вложения или идёт редактирование: ядро страницы после
 *   отправки снимает черновик целиком, и они пропали бы;
 * - `no-core` — у поля Worker-версии amo web есть, а ядро страницы агент не поймал.
 */
export const PAGE_REJECT_REASONS = [
  'no-target',
  'no-file',
  'no-client',
  'no-conversation',
  'unsupported-conversation',
  'build-threw',
  'send-threw',
  'draft-busy',
  'no-core',
] as const;

const MAX_ID_LENGTH = 64;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * `detail` читается через `in`, а не через `instanceof CustomEvent`: у события из другого
 * мира свой конструктор.
 *
 * @param event — событие протокола
 * @returns разобранный JSON из `detail`; null — `detail` не строка или не JSON
 */
const payloadOf = (event: Event): unknown => {
  const detail = 'detail' in event ? event.detail : null;

  return typeof detail === 'string' ? parseJson(detail) : null;
};

const isShortString = (value: unknown, maxLength: number): value is string => {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
};

/**
 * @param value — поле `dims` из чужого `detail`
 * @returns стороны только с полями протокола; null — не объект или сторона не целое больше нуля
 */
const parseDims = (value: unknown): PageDims | null => {
  if (!isObject(value) || !('w' in value) || !('h' in value)) return null;

  const { w, h } = value;

  return isDimension(w) && isDimension(h) ? { w, h } : null;
};

const isRejectReason = (value: unknown): value is PageRejectReason => {
  return PAGE_REJECT_REASONS.some((reason) => {
    return reason === value;
  });
};

/**
 * Возвращается новый объект только с полями протокола: лишнее из чужого `detail` дальше
 * не уходит. Команда без сторон или с неверными сторонами — неверная команда: ядро amo stickers без сторон GIF
 * агенту не пишет, а уходит запасным путём.
 *
 * @param event — событие `PAGE_REQUEST_EVENT`
 * @returns команда; null — формат неверный, на такую команду агент не отвечает
 */
export const parsePageRequest = (event: Event): PageRequest | null => {
  const payload = payloadOf(event);

  if (!isObject(payload) || !('id' in payload) || !('op' in payload)) return null;
  if (!isShortString(payload.id, MAX_ID_LENGTH) || payload.op !== 'send') return null;

  const dims = 'dims' in payload ? parseDims(payload.dims) : null;

  return dims ? { id: payload.id, op: payload.op, dims } : null;
};

/**
 * @param event — событие `PAGE_RESPONSE_EVENT`
 * @returns ответ только с полями протокола; null — формат неверный
 */
export const parsePageResponse = (event: Event): PageResponse | null => {
  const payload = payloadOf(event);

  if (!isObject(payload) || !('id' in payload) || !('status' in payload)) return null;

  const { id, status } = payload;

  if (!isShortString(id, MAX_ID_LENGTH)) return null;

  switch (status) {
    case 'accepted': {
      return { id, status };
    }

    case 'rejected': {
      const reason = 'reason' in payload ? payload.reason : null;

      return isRejectReason(reason) ? { id, status, reason } : null;
    }

    default: {
      return null;
    }
  }
};

/**
 * @param type — `PAGE_REQUEST_EVENT` или `PAGE_RESPONSE_EVENT`
 * @param message — команда или ответ
 * @returns событие протокола с JSON-строкой в `detail`
 */
export const toPageEvent = (
  type: typeof PAGE_REQUEST_EVENT | typeof PAGE_RESPONSE_EVENT,
  message: PageRequest | PageResponse
) => {
  return new CustomEvent(type, { detail: JSON.stringify(message) });
};
