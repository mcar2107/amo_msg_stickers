import {
  PAGE_FILE_ATTR,
  PAGE_REQUEST_EVENT,
  PAGE_RESPONSE_EVENT,
  PAGE_TARGET_ATTR,
  parsePageRequest,
  toPageEvent,
} from '@shared/pageBridge';
import type { PageRejectReason, PageResponse } from '@shared/pageBridge.types';

import type {
  AgentDocument,
  AgentHost,
  AgentMemory,
  AgentNode,
  AgentState,
  PreparedMessage,
} from './agent.types';
import type { AmoClient } from './amo.types';
import { buildMessage } from './buildMessage';
import {
  composePropsOf,
  handleCoreReport,
  isPageElement,
  sendToCore,
  SEQ_MIN,
} from './coreSend';
import type { ComposeProps, CoreSendContext } from './coreSend.types';
import { fieldOf } from './field';
import { findClient } from './findClient';
import { attachReply, replyKey } from './refersTo';
import type { AmoReplyRef } from './refersTo.types';
import { catchCore } from './workerCore';

const SEND_REQUEST_TYPE = 'sendNewMessages';

/**
 * Запрос, которым кнопка «×» над полем ввода снимает ответ.
 */
const CLEAR_REPLY_REQUEST_TYPE = 'updateConversationDraughtRefersToId';

/**
 * Узел ищется по имени атрибута, а значение сравнивается строкой: `id` команды приходит от
 * кого угодно на странице и в CSS-селектор не подставляется.
 *
 * @param doc — документ страницы
 * @param attr — атрибут пометки
 * @param id — `id` команды
 * @returns помеченный этой командой узел или null
 */
const markedNode = (doc: AgentDocument, attr: string, id: string): AgentNode | null => {
  for (const node of doc.querySelectorAll(`[${attr}]`)) {
    if (node.getAttribute(attr) === id) return node;
  }

  return null;
};

const fileOf = (input: AgentNode | null) => {
  const file = fieldOf(fieldOf(input, 'files'), '0');

  return file instanceof File ? file : null;
};

/**
 * Исход запроса amo показывает сам — неотправленным сообщением с повтором или оставшейся
 * плашкой ответа; агенту остаётся оставить след в консоли для разработчика.
 *
 * @param pending — промис `sendRequest`
 * @param what — что делал запрос, для консоли
 */
const logOutcome = async (pending: Promise<unknown>, what: string) => {
  try {
    const result = await pending;

    if (result instanceof Error) {
      console.warn(`[amo-stickers] amo rejected ${what}:`, result.message);
    }
  } catch (error) {
    console.warn(`[amo-stickers] ${what} failed:`, error);
  }
};

/**
 * Дольше этого снимаемый ответ не помнится, даже если запрос снятия так и не завершился: иначе
 * зависший запрос оставил бы ответ снимаемым до перезагрузки, и каждый следующий стикер на ту
 * же плашку уходил бы без цитаты. В живом amo снятие завершается за доли секунды, первое за
 * сессию — около секунды.
 */
const CLEARING_REPLY_MAX_MS = 10_000;

/**
 * Снимаемым ответ остаётся до конца запроса снятия при любом его исходе, но не дольше
 * `CLEARING_REPLY_MAX_MS`. Запрос, завершившийся после этого срока, ключ уже не трогает: за это
 * время тот же ответ мог стать снимаемым снова — следующим стикером.
 *
 * @param request — промис запроса снятия
 * @param key — ключ снимаемого ответа
 * @param clearingReplies — ключи ответов, снятие которых ещё идёт
 */
const forgetWhenSettled = async (
  request: Promise<unknown>,
  key: string,
  clearingReplies: Set<string>
) => {
  let isExpired = false;

  const timer = setTimeout(() => {
    isExpired = true;
    clearingReplies.delete(key);
  }, CLEARING_REPLY_MAX_MS);

  await logOutcome(request, 'reply clear');

  if (isExpired) return;

  clearTimeout(timer);
  clearingReplies.delete(key);
};

/**
 * Снятие ответа — после постановки стикера в очередь: стикер уже ушёл, и никакой исход
 * снятия не должен вести ко второй отправке. Ответ помнится снимаемым, пока запрос не
 * завершился: к его концу store уже без ответа, а если снятие не удалось, плашка осталась, и
 * следующий стикер, как картинка из поля, уйдёт ответом.
 *
 * @param client — `{ reduxStore, sendRequest }` amo
 * @param reply — снимаемый ответ
 * @param clearingReplies — ключи ответов, снятие которых ещё идёт
 */
const clearReply = (
  client: AmoClient,
  reply: AmoReplyRef,
  clearingReplies: Set<string>
) => {
  const key = replyKey(reply);

  clearingReplies.add(key);

  try {
    const request = client.sendRequest({
      type: CLEAR_REPLY_REQUEST_TYPE,
      payload: { conversationId: reply.conversationId, refersToId: null },
    });

    void forgetWhenSettled(request, key, clearingReplies);
  } catch (error) {
    console.warn('[amo-stickers] reply clear threw:', error);
    clearingReplies.delete(key);
  }
};

/**
 * Ответ уходит синхронно, до возврата из `dispatchEvent` ядра: вся работа до вызова
 * `sendRequest` синхронная, а исход очереди не ждём — `accepted` значит «`sendRequest` не
 * бросил», дальнейшее показывает сама amo (design.md, п. 6).
 *
 * В Worker-версии amo web — поле с пропсами её компонента поля — стикер уходит командой ядра страницы, иначе —
 * очередью amo через `sendRequest`.
 *
 * @param doc — документ страницы
 * @param event — команда ядра
 * @param agent — память агента, пойманное ядро страницы и окно
 */
const handleRequest = (doc: AgentDocument, event: Event, agent: AgentState) => {
  const request = parsePageRequest(event);

  if (!request) return;

  const { id } = request;

  const respond = (response: PageResponse) => {
    doc.dispatchEvent(toPageEvent(PAGE_RESPONSE_EVENT, response));
  };

  const reject = (reason: PageRejectReason) => {
    respond({ id, status: 'rejected', reason });
  };

  const target = markedNode(doc, PAGE_TARGET_ATTR, id);

  if (!target) return reject('no-target');

  const file = fileOf(markedNode(doc, PAGE_FILE_ATTR, id));

  if (!file) return reject('no-file');

  const { memory } = agent;
  const field = isPageElement(target) ? target : null;

  /**
   * Fiber и пропсы поля — чужие объекты, и их геттеры могут бросить: исключение — отказ с причиной, как у
   * чтения состояния ниже.
   */
  let compose: ComposeProps | null;

  try {
    compose = field ? composePropsOf(field) : null;
  } catch (error) {
    console.warn('[amo-stickers] amo compose props unreadable:', error);

    return reject('build-threw');
  }

  if (field && compose) {
    const context: CoreSendContext = { core: agent.catcher.core(), memory };

    if (agent.host.InputEvent) context.InputEvent = agent.host.InputEvent;

    const reason = sendToCore({ field, compose, file, dims: request.dims }, context);

    return reason ? reject(reason) : respond({ id, status: 'accepted' });
  }

  const client = findClient(target);

  if (!client) return reject('no-client');

  /**
   * `getState` и чтение состояния — чужой код: исключение в них — отказ с причиной, а не
   * молчание, которое ядро приняло бы за отсутствие агента.
   */
  let prepared: PreparedMessage;

  try {
    const state = client.reduxStore.getState();
    const built = buildMessage(state, file, Date.now(), Math.random);

    prepared =
      'reason' in built
        ? built
        : attachReply(state, built.message, memory.clearingReplies);
  } catch (error) {
    console.warn('[amo-stickers] amo state unreadable:', error);

    return reject('build-threw');
  }

  if ('reason' in prepared) return reject(prepared.reason);

  const { message, replyToClear } = prepared;

  let sending: Promise<unknown>;

  try {
    sending = client.sendRequest({
      type: SEND_REQUEST_TYPE,
      payload: { messages: [message] },
    });
  } catch (error) {
    console.warn('[amo-stickers] sendRequest threw:', error);

    return reject('send-threw');
  }

  void logOutcome(sending, 'sticker send');

  if (replyToClear) clearReply(client, replyToClear, memory.clearingReplies);

  respond({ id, status: 'accepted' });
};

/**
 * Запускает агента в мире страницы. Повторный запуск на той же странице — расширение и
 * userscript вместе или двойное подключение — ничего не делает: второй слушатель отправил
 * бы стикер дважды.
 *
 * Ядро страницы Worker-версии ловится с запуска: агент запускается до скриптов страницы, и `Worker`, созданный
 * раньше, ему не виден.
 *
 * @param doc — документ страницы
 * @param host — `window` страницы: флаг запуска, `Worker` и `InputEvent`
 * @returns true — агент запущен этим вызовом; false — он уже работал на странице
 */
export const startAgent = (doc: AgentDocument, host: AgentHost) => {
  if (host.__amoStickersPage) return false;

  const memory: AgentMemory = {
    clearingReplies: new Set(),
    seq: SEQ_MIN,
    sending: new Map(),
  };

  host.__amoStickersPage = true;

  const catcher = catchCore(host, (report) => {
    handleCoreReport(report, memory);
  });

  doc.addEventListener(PAGE_REQUEST_EVENT, (event) => {
    handleRequest(doc, event, { catcher, host, memory });
  });

  return true;
};
