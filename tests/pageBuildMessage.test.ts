import { describe, expect, it } from 'vitest';

import { buildMessage } from '@page/buildMessage';
import type { AmoStickerMessage } from '@page/buildMessage.types';

import { makeGif } from './helpers';

const NOW = Date.UTC(2026, 8, 28, 14, 51, 14, 181);
const FILE_NAME = '😀.amostk.k-sticker.gif';
const CHAT_ID = '00000000-0000-4000-8000-000000000061';

const stateWith = (conversationType: string | undefined, route = 'conversation') => {
  return {
    location: {
      type: route,
      payload: { conversationType: 'direct', selectedConversationId: CHAT_ID },
    },
    dialogs: { [CHAT_ID]: { id: CHAT_ID, conversationType } },
  };
};

const gifFile = () => {
  return new File([makeGif(8, 8)], FILE_NAME, {
    type: 'image/gif',
    lastModified: 1_700_000_000_000,
  });
};

const build = (
  state: unknown,
  random = () => {
    return 0.5;
  }
) => {
  const result = buildMessage(state, gifFile(), NOW, random);

  if (!('message' in result))
    throw new Error(`ожидалось сообщение, пришло ${result.reason}`);

  return result.message;
};

/**
 * Разбор времени из uuid v1 по RFC 4122: время в id должно совпасть с `now`.
 */
const amoTimestamp = (id: string) => {
  const [low = '', mid = '', high = ''] = id.split('-');

  return Math.floor(
    (Number.parseInt([high.slice(1), mid, low].join(''), 16) - 122_192_928_000_000_000) /
      10_000
  );
};

describe('buildMessage', () => {
  it('собирает сообщение для очереди amo для личного чата', () => {
    const message = build(stateWith('user'));
    const expected: Omit<AmoStickerMessage, 'id' | 'idempotencyKey' | 'media'> = {
      conversationId: CHAT_ID,
      conversationType: 'user',
      flags: [2],
      from: { memberSelf: {} },
      to: { memberAll: {} },
      fromMember: { memberId: '', memberType: 'self' },
      toMember: { memberId: '', memberType: 'all' },
      message: '',
      date: NOW,
      sending: true,
      isLocal: true,
      type: 'regular',
    };

    expect(message).toMatchObject(expected);
    expect(message).toHaveProperty('user', CHAT_ID);
    expect(message).not.toHaveProperty('refersTo');
    expect(message.idempotencyKey).toBe(message.id);
  });

  it.each(['chat', 'lead', 'request', 'bot', 'client', 'folder'])(
    'берёт тип пира %s из dialogs, а не из адреса',
    (type) => {
      const message = build(stateWith(type));

      expect(message.conversationType).toBe(type);
      expect(message).toHaveProperty(type, CHAT_ID);
    }
  );

  it('без типа пира в dialogs — no-conversation, а не угаданный тип', () => {
    expect(buildMessage(stateWith(undefined), gifFile(), NOW, Math.random)).toEqual({
      reason: 'no-conversation',
    });
  });

  it('id — uuid v1 с node amo, время из id равно now', () => {
    const { id } = build(stateWith('user'));

    expect(id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-1[\da-f]{3}-[89ab][\da-f]{3}-0123456789ab$/
    );
    expect(amoTimestamp(id)).toBe(NOW);
  });

  it('два сообщения в одну миллисекунду получают разные id', () => {
    const first = build(stateWith('user'), () => {
      return 0.1;
    });
    const second = build(stateWith('user'), () => {
      return 0.9;
    });

    expect(first.id).not.toBe(second.id);
    expect(amoTimestamp(second.id)).toBe(NOW);
  });

  it('медиа — локальное фото PREPARING, id медиа производный от id сообщения', () => {
    const file = gifFile();
    const result = buildMessage(stateWith('user'), file, NOW, () => {
      return 0.5;
    });

    if (!('message' in result)) throw new Error(result.reason);

    const { media } = result.message;

    expect(media).toEqual({
      id: `amostk-${result.message.id}`,
      isLocal: true,
      fileName: FILE_NAME,
      localPhotoSize: { localFileId: `amostk-${result.message.id}`, size: file.size },
      uploadedFileId: null,
      localFlag: 1,
      mediaType: 'photo',
      file,
    });
  });

  it.each([
    ['открыты настройки', stateWith('user', 'settings')],
    ['чата нет в dialogs', { ...stateWith('user'), dialogs: {} }],
    ['нет location', { dialogs: {} }],
    ['состояние не объект', null],
  ])('no-conversation: %s', (_case, state) => {
    expect(buildMessage(state, gifFile(), NOW, Math.random)).toEqual({
      reason: 'no-conversation',
    });
  });

  it('unsupported-conversation для типа чата, для которого amo не собирает запрос', () => {
    expect(buildMessage(stateWith('subject'), gifFile(), NOW, Math.random)).toEqual({
      reason: 'unsupported-conversation',
    });
  });
});
