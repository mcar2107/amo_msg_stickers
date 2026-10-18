import { describe, expect, it } from 'vitest';

import { createPageClient } from '@core/pageClient';
import {
  PAGE_FILE_ATTR,
  PAGE_REQUEST_EVENT,
  PAGE_RESPONSE_EVENT,
  PAGE_TARGET_ATTR,
  parsePageRequest,
} from '@shared/pageBridge';

import { FakeDocument, FakeElement } from './helpers';
import { makeGif } from './helpers';

const file = new File([makeGif(8, 8)], 'a.amostk.k-sticker.gif', { type: 'image/gif' });
const dims = { w: 8, h: 8 };

/**
 * Агент-двойник: на каждую команду синхронно отвечает `detail`, который строит `reply` по
 * `id`.
 */
const answerWith = (doc: FakeDocument, reply: (id: string) => unknown) => {
  doc.addEventListener(PAGE_REQUEST_EVENT, (event) => {
    const request = parsePageRequest(event);

    if (!request) return;
    doc.dispatchEvent(
      new CustomEvent(PAGE_RESPONSE_EVENT, { detail: JSON.stringify(reply(request.id)) })
    );
  });
};

const setup = () => {
  const doc = new FakeDocument();
  const editable = new FakeElement();
  const inputs: FakeElement[] = [];
  const client = createPageClient(doc, () => {
    const input = new FakeElement();

    inputs.push(input);

    return input;
  });

  return { client, doc, editable, inputs };
};

describe('createPageClient', () => {
  it('accepted: агент получает поле и файл, помеченные той же командой', () => {
    const { client, doc, editable, inputs } = setup();
    const seen: boolean[] = [];

    answerWith(doc, (id) => {
      seen.push(
        editable.getAttribute(PAGE_TARGET_ATTR) === id,
        inputs[0]?.getAttribute(PAGE_FILE_ATTR) === id,
        doc.querySelectorAll(`[${PAGE_FILE_ATTR}]`).length === 1
      );

      return { id, status: 'accepted' };
    });

    expect(client.send(editable, file, dims)).toEqual({ status: 'accepted' });
    expect(seen).toEqual([true, true, true]);
  });

  it('передаёт стороны GIF в команде', () => {
    const { client, doc, editable } = setup();
    const requests: unknown[] = [];

    doc.addEventListener(PAGE_REQUEST_EVENT, (event) => {
      requests.push(parsePageRequest(event));
    });
    client.send(editable, file, { w: 300, h: 70 });

    expect(requests).toEqual([
      { id: expect.any(String), op: 'send', dims: { w: 300, h: 70 } },
    ]);
  });

  it('rejected: unavailable с причиной агента', () => {
    const { client, doc, editable } = setup();

    answerWith(doc, (id) => {
      return { id, status: 'rejected', reason: 'no-client' };
    });

    expect(client.send(editable, file, dims)).toEqual({
      status: 'unavailable',
      reason: 'no-client',
    });
  });

  it('агента нет: unavailable сразу, без ожидания', () => {
    const { client, editable } = setup();

    expect(client.send(editable, file, dims)).toEqual({
      status: 'unavailable',
      reason: 'no-agent',
    });
  });

  it('чужой id и битый detail не засчитываются', () => {
    const { client, doc, editable } = setup();

    answerWith(doc, (id) => {
      return { id: `${id}-чужой`, status: 'accepted' };
    });
    doc.addEventListener(PAGE_REQUEST_EVENT, () => {
      doc.dispatchEvent(new CustomEvent(PAGE_RESPONSE_EVENT, { detail: '{' }));
    });

    expect(client.send(editable, file, dims)).toEqual({
      status: 'unavailable',
      reason: 'no-agent',
    });
  });

  it('засчитывается первый ответ: второй, противоречащий, не меняет итог', () => {
    const { client, doc, editable } = setup();

    answerWith(doc, (id) => {
      return { id, status: 'accepted' };
    });
    answerWith(doc, (id) => {
      return { id, status: 'rejected', reason: 'no-client' };
    });

    expect(client.send(editable, file, dims)).toEqual({ status: 'accepted' });
  });

  it.each([
    [
      'accepted',
      (doc: FakeDocument) => {
        answerWith(doc, (id) => {
          return { id, status: 'accepted' };
        });
      },
    ],
    [
      'отсутствия агента',
      () => {
        return undefined;
      },
    ],
  ])('после %s не остаётся пометок, <input> и слушателей', (_case, arrange) => {
    const { client, doc, editable, inputs } = setup();

    arrange(doc);
    client.send(editable, file, dims);

    expect(editable.getAttribute(PAGE_TARGET_ATTR)).toBeNull();
    expect(inputs[0]?.isConnected).toBe(false);
    expect(doc.querySelectorAll(`[${PAGE_FILE_ATTR}]`)).toEqual([]);
    expect(doc.listenerCount(PAGE_RESPONSE_EVENT)).toBe(0);
  });

  it('у каждой отправки свой id', () => {
    const { client, doc, editable } = setup();
    const ids: string[] = [];

    answerWith(doc, (id) => {
      ids.push(id);

      return { id, status: 'accepted' };
    });
    client.send(editable, file, dims);
    client.send(editable, file, dims);

    expect(new Set(ids).size).toBe(2);
  });
});
