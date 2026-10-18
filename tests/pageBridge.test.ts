import { describe, expect, it } from 'vitest';

import {
  PAGE_REQUEST_EVENT,
  PAGE_RESPONSE_EVENT,
  parsePageRequest,
  parsePageResponse,
  toPageEvent,
} from '@shared/pageBridge';

const eventWith = (detail: unknown) => {
  return new CustomEvent(PAGE_REQUEST_EVENT, { detail });
};

const DIMS = { w: 8, h: 8 };

const json = (value: unknown) => {
  return eventWith(JSON.stringify(value));
};

describe('parsePageRequest', () => {
  it('разбирает команду send, созданную toPageEvent', () => {
    const event = toPageEvent(PAGE_REQUEST_EVENT, { id: 'a-1', op: 'send', dims: DIMS });

    expect(parsePageRequest(event)).toEqual({ id: 'a-1', op: 'send', dims: DIMS });
  });

  it('не пропускает лишние поля дальше', () => {
    expect(
      parsePageRequest(json({ id: 'a', op: 'send', dims: DIMS, extra: { x: 1 } }))
    ).toEqual({ id: 'a', op: 'send', dims: DIMS });
  });

  it.each([
    ['неизвестный op', { id: 'a', op: 'stash', dims: DIMS }],
    ['op не строка', { id: 'a', op: { toString: 'send' }, dims: DIMS }],
    ['нет id', { op: 'send', dims: DIMS }],
    ['id не строка', { id: 1, op: 'send', dims: DIMS }],
    ['пустой id', { id: '', op: 'send', dims: DIMS }],
    ['id длиннее 64', { id: 'x'.repeat(65), op: 'send', dims: DIMS }],
    ['массив', ['a', 'send']],
    ['null', null],
  ])('отклоняет: %s', (_case, payload) => {
    expect(parsePageRequest(json(payload))).toBeNull();
  });

  it('отклоняет detail-объект и не-JSON', () => {
    expect(parsePageRequest(eventWith({ id: 'a', op: 'send' }))).toBeNull();
    expect(parsePageRequest(eventWith('{id:'))).toBeNull();
    expect(parsePageRequest(new Event(PAGE_REQUEST_EVENT))).toBeNull();
  });

  it('принимает id ровно 64 символа', () => {
    const id = 'x'.repeat(64);

    expect(parsePageRequest(json({ id, op: 'send', dims: DIMS }))).toEqual({
      id,
      op: 'send',
      dims: DIMS,
    });
  });

  it('разбирает стороны GIF, созданные toPageEvent', () => {
    const event = toPageEvent(PAGE_REQUEST_EVENT, {
      id: 'a',
      op: 'send',
      dims: { w: 300, h: 70 },
    });

    expect(parsePageRequest(event)).toStrictEqual({
      id: 'a',
      op: 'send',
      dims: { w: 300, h: 70 },
    });
  });

  it('отклоняет команду без сторон', () => {
    expect(parsePageRequest(json({ id: 'a', op: 'send' }))).toBeNull();
  });

  it('не пропускает лишние поля сторон дальше', () => {
    expect(
      parsePageRequest(json({ id: 'a', op: 'send', dims: { w: 1, h: 2, d: 3 } }))
    ).toStrictEqual({ id: 'a', op: 'send', dims: { w: 1, h: 2 } });
  });

  it.each([
    ['ноль', { w: 0, h: 70 }],
    ['отрицательная', { w: 300, h: -70 }],
    ['дробная', { w: 300.5, h: 70 }],
    ['NaN (в JSON — null)', { w: Number.NaN, h: 70 }],
    ['бесконечность (в JSON — null)', { w: 300, h: Number.POSITIVE_INFINITY }],
    ['строка', { w: '300', h: 70 }],
    ['больше безопасного целого', { w: 2 ** 53, h: 70 }],
    ['нет h', { w: 300 }],
    ['null', null],
    ['массив', [300, 70]],
    ['число', 300],
  ])('отклоняет команду со сторонами: %s', (_case, dims) => {
    expect(parsePageRequest(json({ id: 'a', op: 'send', dims }))).toBeNull();
  });
});

describe('parsePageResponse', () => {
  it('разбирает accepted и rejected, созданные toPageEvent', () => {
    expect(
      parsePageResponse(toPageEvent(PAGE_RESPONSE_EVENT, { id: 'a', status: 'accepted' }))
    ).toEqual({ id: 'a', status: 'accepted' });
    expect(
      parsePageResponse(
        toPageEvent(PAGE_RESPONSE_EVENT, {
          id: 'a',
          status: 'rejected',
          reason: 'no-client',
        })
      )
    ).toEqual({ id: 'a', status: 'rejected', reason: 'no-client' });
  });

  it.each(['draft-busy', 'no-core'])('принимает причину %s', (reason) => {
    expect(parsePageResponse(json({ id: 'a', status: 'rejected', reason }))).toEqual({
      id: 'a',
      status: 'rejected',
      reason,
    });
  });

  it('не пропускает лишние поля дальше', () => {
    expect(parsePageResponse(json({ id: 'a', status: 'accepted', reason: 'x' }))).toEqual(
      {
        id: 'a',
        status: 'accepted',
      }
    );
  });

  it.each([
    ['неизвестный статус', { id: 'a', status: 'sent' }],
    ['rejected без reason', { id: 'a', status: 'rejected' }],
    ['reason не строка', { id: 'a', status: 'rejected', reason: 42 }],
    ['неизвестная причина', { id: 'a', status: 'rejected', reason: 'timeout' }],
    ['id не строка', { id: 7, status: 'accepted' }],
  ])('отклоняет: %s', (_case, payload) => {
    expect(parsePageResponse(json(payload))).toBeNull();
  });
});
