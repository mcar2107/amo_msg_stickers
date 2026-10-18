import { isObject } from '@shared/guards';

import type { AmoStickerMessage } from './buildMessage.types';
import { fieldOf } from './field';
import type { AmoQuotedMessage, AmoReplyRef, AttachedReply } from './refersTo.types';
import { isFilledString, isQuotedMessage } from './refersTo.types';

/**
 * Ответ стикером повторяет то, что страница amo кладёт в очередь при ответе картинкой из
 * поля ввода: в `refersTo` — объект сообщения, на которое отвечают.
 */

/**
 * Бит пересланного сообщения в `flags[0]`.
 */
const FLAG_FORWARDED = 128;

/**
 * @param state — состояние store amo
 * @param conversationId — id открытого чата
 * @returns id сообщения, на которое отвечают в черновике чата; null — ответа нет
 */
export const draughtReplyIdOf = (state: unknown, conversationId: string) => {
  const draught = fieldOf(fieldOf(state, 'conversationDraughts'), conversationId);
  const refersTo = fieldOf(draught, 'refersTo');

  return isFilledString(refersTo) ? refersTo : null;
};

/**
 * @param reply — ответ в черновике
 * @returns ключ ответа в наборе снимаемых агентом
 */
export const replyKey = ({ conversationId, messageId }: AmoReplyRef) => {
  return `${conversationId}:${messageId}`;
};

/**
 * Пересланное сообщение цитируется содержимым исходного под `id`, чатом и адресатом
 * пересланного и без флага пересылки — так, как его цитирует картинка из поля ввода.
 * Пересланное без вложенного сообщения цитируется как есть.
 *
 * @param state — состояние store amo
 * @param replyId — id сообщения, на которое отвечают
 * @returns сообщение для `refersTo`; null — страница его не загрузила или форма чужая
 */
export const quotedMessageOf = (
  state: unknown,
  replyId: string
): AmoQuotedMessage | null => {
  const message = fieldOf(fieldOf(state, 'messages'), replyId);

  if (!isQuotedMessage(message, replyId)) return null;

  const flag = fieldOf(fieldOf(message, 'flags'), '0');
  const original = fieldOf(message, 'refersTo');

  if (typeof flag !== 'number' || !(flag & FLAG_FORWARDED) || !isObject(original)) {
    return message;
  }

  const { id, conversationId, conversationType } = message;

  return {
    ...original,
    flags: [flag & ~FLAG_FORWARDED],
    id,
    conversationId,
    conversationType,
    toMember: fieldOf(message, 'toMember'),
    to: fieldOf(message, 'to'),
  };
};

/**
 * Ответ, чьё сообщение страница не загрузила, не снимается: стикер уходит без цитаты, а
 * плашка остаётся, чтобы ответ не пропал молча.
 *
 * Снятие ответа доходит до store не сразу, и стикер, отправленный в это окно, прочитал бы тот
 * же ответ — вторую цитату того же сообщения. Поэтому ответ, снятие которого агент ещё не
 * дождался, пропускается: стикер уходит без цитаты, как второе сообщение после картинки из
 * поля.
 *
 * @param state — состояние store amo
 * @param message — собранное сообщение стикера
 * @param clearingReplies — ключи (`replyKey`) ответов, снятие которых ещё идёт
 * @returns сообщение с ответом из черновика его чата и ответ, который после отправки снять
 */
export const attachReply = (
  state: unknown,
  message: AmoStickerMessage,
  clearingReplies: ReadonlySet<string>
): AttachedReply => {
  const { conversationId } = message;
  const replyId = draughtReplyIdOf(state, conversationId);
  const isClearing =
    replyId && clearingReplies.has(replyKey({ conversationId, messageId: replyId }));
  const quoted = replyId && !isClearing ? quotedMessageOf(state, replyId) : null;

  if (!quoted) return { message, replyToClear: null };

  return {
    message: { ...message, refersTo: quoted },
    replyToClear: { conversationId, messageId: quoted.id },
  };
};
