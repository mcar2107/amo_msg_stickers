import { describe, expect, it } from 'vitest';

import type { AmoStickerMessage } from '@page/buildMessage.types';
import { attachReply, draughtReplyIdOf, quotedMessageOf, replyKey } from '@page/refersTo';

const CHAT_ID = 'chat-1';
const REPLY_ID = 'msg-1';
const FORWARDED = 128;
const NONE_CLEARING: ReadonlySet<string> = new Set();
const RECEIVED = 4;

const message = (fields: Record<string, unknown> = {}) => {
  return {
    id: REPLY_ID,
    conversationId: CHAT_ID,
    conversationType: 'user',
    flags: [RECEIVED],
    message: 'на что отвечаем',
    toMember: { memberId: '', memberType: 'all' },
    to: { memberAll: {} },
    ...fields,
  };
};

const stateWith = (refersTo: unknown, messages: unknown = { [REPLY_ID]: message() }) => {
  return {
    conversationDraughts: { [CHAT_ID]: { id: CHAT_ID, refersTo, value: 'привет' } },
    messages,
  };
};

describe('draughtReplyIdOf', () => {
  it('берёт id ответа из черновика открытого чата', () => {
    expect(draughtReplyIdOf(stateWith(REPLY_ID), CHAT_ID)).toBe(REPLY_ID);
  });

  it.each([
    ['нет черновиков', {}],
    [
      'черновик другого чата',
      { conversationDraughts: { other: { refersTo: REPLY_ID } } },
    ],
    ['refersTo пуст', stateWith('')],
    ['refersTo null', stateWith(null)],
    ['refersTo не строка', stateWith(42)],
    ['состояние не объект', null],
  ])('без ответа: %s', (_case, state) => {
    expect(draughtReplyIdOf(state, CHAT_ID)).toBeNull();
  });
});

describe('quotedMessageOf', () => {
  it('обычное сообщение уходит тем же объектом из состояния', () => {
    const record = message();

    expect(quotedMessageOf(stateWith(REPLY_ID, { [REPLY_ID]: record }), REPLY_ID)).toBe(
      record
    );
  });

  it('пересланное разворачивается в исходное под id, чатом и адресатом пересланного', () => {
    const original = {
      id: 'original',
      conversationId: 'source-chat',
      conversationType: 'chat',
      flags: [RECEIVED],
      message: 'исходный текст',
      media: { id: 'photo' },
      toMember: { memberId: 'u-1', memberType: 'user' },
      to: { memberUser: {} },
    };
    const forwarded = message({ flags: [FORWARDED | RECEIVED], refersTo: original });

    expect(
      quotedMessageOf(stateWith(REPLY_ID, { [REPLY_ID]: forwarded }), REPLY_ID)
    ).toEqual({
      ...original,
      flags: [RECEIVED],
      id: REPLY_ID,
      conversationId: CHAT_ID,
      conversationType: 'user',
      toMember: forwarded.toMember,
      to: forwarded.to,
    });
  });

  it.each([
    ['без вложенного сообщения', undefined],
    ['refersTo null', null],
    ['refersTo — id строкой', 'original'],
  ])('пересланное %s цитируется как есть', (_case, refersTo) => {
    const forwarded = message({ flags: [FORWARDED], refersTo });

    expect(
      quotedMessageOf(stateWith(REPLY_ID, { [REPLY_ID]: forwarded }), REPLY_ID)
    ).toBe(forwarded);
  });

  it.each([
    ['нет messages', { conversationDraughts: {} }],
    ['сообщения нет в messages', stateWith(REPLY_ID, {})],
    [
      'id записи не совпадает',
      stateWith(REPLY_ID, { [REPLY_ID]: message({ id: 'other' }) }),
    ],
    [
      'нет conversationId',
      stateWith(REPLY_ID, { [REPLY_ID]: message({ conversationId: undefined }) }),
    ],
    [
      'пустой conversationType',
      stateWith(REPLY_ID, { [REPLY_ID]: message({ conversationType: '' }) }),
    ],
    ['запись не объект', stateWith(REPLY_ID, { [REPLY_ID]: 'msg-1' })],
  ])('null: %s', (_case, state) => {
    expect(quotedMessageOf(state, REPLY_ID)).toBeNull();
  });
});

describe('attachReply', () => {
  const sticker = (): AmoStickerMessage => {
    return {
      conversationId: CHAT_ID,
      conversationType: 'user',
      flags: [2],
      from: { memberSelf: {} },
      to: { memberAll: {} },
      fromMember: { memberId: '', memberType: 'self' },
      toMember: { memberId: '', memberType: 'all' },
      message: '',
      id: 'sticker-1',
      idempotencyKey: 'sticker-1',
      date: 0,
      media: {
        id: 'amostk-sticker-1',
        isLocal: true,
        fileName: 'a.amostk.k-sticker.gif',
        localPhotoSize: { localFileId: 'amostk-sticker-1', size: 1 },
        uploadedFileId: null,
        localFlag: 1,
        mediaType: 'photo',
        file: new File([], 'a.amostk.k-sticker.gif'),
      },
      sending: true,
      isLocal: true,
      type: 'regular',
    };
  };

  it('с активным ответом — refersTo с сообщением и ответ к снятию', () => {
    const record = message();
    const result = attachReply(
      stateWith(REPLY_ID, { [REPLY_ID]: record }),
      sticker(),
      NONE_CLEARING
    );

    expect(result.message.refersTo).toBe(record);
    expect(result.message).toMatchObject({ id: 'sticker-1', conversationId: CHAT_ID });
    expect(result.replyToClear).toEqual({ conversationId: CHAT_ID, messageId: REPLY_ID });
  });

  it('без ответа — сообщение то же, снимать нечего', () => {
    const plain = sticker();

    expect(attachReply({}, plain, NONE_CLEARING)).toEqual({
      message: plain,
      replyToClear: null,
    });
  });

  it('сообщение ответа не загружено — без refersTo, ответ не снимается', () => {
    const result = attachReply(stateWith(REPLY_ID, {}), sticker(), NONE_CLEARING);

    expect(result.message).not.toHaveProperty('refersTo');
    expect(result.replyToClear).toBeNull();
  });

  it('ответ, снятие которого идёт, — без refersTo и без второго снятия', () => {
    const clearing = new Set([
      replyKey({ conversationId: CHAT_ID, messageId: REPLY_ID }),
    ]);
    const result = attachReply(stateWith(REPLY_ID), sticker(), clearing);

    expect(result.message).not.toHaveProperty('refersTo');
    expect(result.replyToClear).toBeNull();
  });

  it('снимаемый ответ другого чата не мешает ответу открытого', () => {
    const clearing = new Set([
      replyKey({ conversationId: 'chat-2', messageId: REPLY_ID }),
    ]);
    const result = attachReply(stateWith(REPLY_ID), sticker(), clearing);

    expect(result.replyToClear).toEqual({ conversationId: CHAT_ID, messageId: REPLY_ID });
  });
});
