import { afterEach, describe, expect, it, vi } from 'vitest';

import { catchCore } from '../src/page/workerCore';
import type { CoreHost } from '../src/page/workerCore.types';

import { CALL_LOADED, FakeWorker } from './helpers/fakeWorker';

/**
 * @param onReport — слушатель докладов агента; по умолчанию копит их в `reports`
 */
const setup = (onReport?: (report: unknown) => void) => {
  const host: CoreHost = { Worker: FakeWorker };
  const reports: unknown[] = [];
  const catcher = catchCore(
    host,
    onReport ||
      ((report) => {
        reports.push(report);
      })
  );

  const create = (name = 'worker') => {
    const Created = host.Worker;

    if (!Created) throw new Error('Worker не подменён');

    const worker = new Created('blob:script', { type: 'module', name });

    if (!(worker instanceof FakeWorker)) throw new Error('не подкласс Worker страницы');

    return worker;
  };

  return { catcher, create, host, reports };
};

describe('catchCore', () => {
  it('подменяет Worker подклассом с теми же аргументами конструктора', () => {
    const { create, host } = setup();
    const worker = create('core');

    expect(host.Worker).not.toBe(FakeWorker);
    expect(worker).toBeInstanceOf(FakeWorker);
    expect(worker.args).toEqual(['blob:script', { type: 'module', name: 'core' }]);
  });

  it('onmessage, слушатели, postMessage с transfer и terminate — как без агента', () => {
    const { create } = setup();
    const worker = create();
    const onmessage = vi.fn();
    const listener = vi.fn();
    const buffer = new ArrayBuffer(4);

    worker.onmessage = onmessage;
    worker.addEventListener('message', listener);
    worker.emit({ id: 1 });
    worker.emit(CALL_LOADED);
    worker.postMessage({ kind: 'draft' }, [buffer]);
    worker.terminate();

    expect(
      onmessage.mock.calls.map(([event]) => {
        return event.data;
      })
    ).toEqual([{ id: 1 }, CALL_LOADED]);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(worker.posted).toEqual([[{ kind: 'draft' }, [buffer]]]);
    expect(worker.terminated).toBe(1);
  });

  it('ядро — по докладу call, имя Worker-а не важно', () => {
    const { catcher, create } = setup();
    const worker = create('что угодно');

    expect(catcher.pendingCount()).toBe(1);

    worker.emit(CALL_LOADED);

    expect(catcher.core()).toBe(worker);
    expect(catcher.pendingCount()).toBe(0);
  });

  it.each([
    ['sent', { kind: 'sent', chat: 'c', seq: 1, key: 'k', refused: null }],
    ['authorizationState', { kind: 'authorizationState' }],
  ])('ядро — по первому докладу %s', (_kind, data) => {
    const { catcher, create } = setup();
    const worker = create();

    worker.emit(data);

    expect(catcher.core()).toBe(worker);
  });

  it.each([
    ['ответ Worker-а фото', { id: 1, w: 480, h: 270 }],
    ['не объект', 'loaded'],
    ['незнакомый kind', { kind: 'row' }],
    ['доклад стенда draftState', { kind: 'draftState' }],
    ['call без dir', { kind: 'call', name: 'loaded' }],
    ['call с чужим dir', { kind: 'call', dir: 'up', name: 'loaded' }],
    ['call без строкового name', { kind: 'call', dir: 'out', name: 1 }],
  ])('первое сообщение другой формы (%s) — Worker забыт', (_case, data) => {
    const { catcher, create, reports } = setup();
    const worker = create('core');

    worker.emit(data);
    worker.emit(CALL_LOADED);

    expect(catcher.core()).toBeNull();
    expect(catcher.pendingCount()).toBe(0);
    expect(reports).toEqual([]);
  });

  it('error до первого сообщения — Worker забыт', () => {
    const { catcher, create } = setup();
    const worker = create();

    worker.fail();
    worker.emit(CALL_LOADED);

    expect(catcher.core()).toBeNull();
    expect(catcher.pendingCount()).toBe(0);
  });

  it('terminate до первого сообщения — Worker забыт', () => {
    const { catcher, create } = setup();
    const worker = create();

    worker.terminate();
    worker.emit(CALL_LOADED);

    expect(catcher.core()).toBeNull();
    expect(catcher.pendingCount()).toBe(0);
    expect(worker.terminated).toBe(1);
  });

  it('terminate ядра — ядра нет, новое ядро ловится', () => {
    const { catcher, create } = setup();
    const first = create();

    first.emit(CALL_LOADED);
    first.terminate();

    expect(catcher.core()).toBeNull();

    const second = create();

    second.emit(CALL_LOADED);

    expect(catcher.core()).toBe(second);
  });

  it('новое ядро сменяет прежнее', () => {
    const { catcher, create } = setup();
    const first = create();
    const second = create();

    first.emit(CALL_LOADED);
    second.emit(CALL_LOADED);

    expect(catcher.core()).toBe(second);
  });

  it('error ядра его не забывает', () => {
    const { catcher, create } = setup();
    const worker = create();

    worker.emit(CALL_LOADED);
    worker.fail();

    expect(catcher.core()).toBe(worker);
  });

  it('доклады ядра, начиная с первого, уходят слушателю агента', () => {
    const { create, reports } = setup();
    const worker = create();
    const sent = { kind: 'sent', chat: 'c', seq: 1, key: 'k', refused: null };

    worker.emit(CALL_LOADED);
    worker.emit(sent);
    worker.emit({ любое: 'сообщение' });

    expect(reports).toEqual([CALL_LOADED, sent, { любое: 'сообщение' }]);
  });

  it('сбой слушателя агента не выходит в страницу', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
    const failure = new Error('сбой');
    const { catcher, create } = setup(() => {
      throw failure;
    });
    const worker = create();
    const onmessage = vi.fn();

    worker.onmessage = onmessage;
    worker.emit(CALL_LOADED);

    expect(warn).toHaveBeenCalledWith(
      '[amo-stickers] core report handling failed:',
      failure
    );
    expect(catcher.core()).toBe(worker);
    expect(onmessage).toHaveBeenCalledTimes(1);
  });

  it('без Worker в окне ничего не ловит', () => {
    const host: CoreHost = {};
    const catcher = catchCore(host, vi.fn());

    expect(host.Worker).toBeUndefined();
    expect(catcher.core()).toBeNull();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
