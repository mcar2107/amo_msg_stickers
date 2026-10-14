import type { Mock } from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { startAgent } from '../src/page/agent';
import type { AmoRequest } from '../src/page/amo.types';
import { nextSeq, SENDING_MAX } from '../src/page/coreSend';
import { fieldOf } from '../src/page/field';
import {
  PAGE_FILE_ATTR,
  PAGE_REQUEST_EVENT,
  PAGE_RESPONSE_EVENT,
  PAGE_TARGET_ATTR,
  parsePageResponse,
} from '../src/shared/pageBridge';

import { FakeDocument, FakeElement } from './helpers/fakeDocument';
import { fiberChain, nodeWithFiber } from './helpers/fakeFiber';
import { FakePageNode } from './helpers/fakePageNode';
import { CALL_LOADED, FakeWorker } from './helpers/fakeWorker';
import { makeGif } from './helpers/makeGif';

const CHAT_ID = 'chat-1';
const DRAFT_TEXT = 'привет, это черновик';

const REPLY_ID = 'msg-1';

const DIMS = { w: 8, h: 8 };

const amoState = () => {
  return {
    location: { type: 'conversation', payload: { selectedConversationId: CHAT_ID } },
    dialogs: { [CHAT_ID]: { id: CHAT_ID, conversationType: 'chat' } },
  };
};

/**
 * Состояние с активным ответом; `refersTo: null` — store уже снял ответ.
 */
const replyState = (refersTo: string | null = REPLY_ID) => {
  return {
    ...amoState(),
    conversationDraughts: { [CHAT_ID]: { id: CHAT_ID, refersTo, value: DRAFT_TEXT } },
    messages: {
      [REPLY_ID]: { id: REPLY_ID, conversationId: CHAT_ID, conversationType: 'chat' },
    },
  };
};

const CLEAR_REQUEST = {
  type: 'updateConversationDraughtRefersToId',
  payload: { conversationId: CHAT_ID, refersToId: null },
};

const requestTypes = (sendRequest: Mock<(request: AmoRequest) => Promise<unknown>>) => {
  return sendRequest.mock.calls.map(([request]) => {
    return request.type;
  });
};

/**
 * Макрозадача, а не пара микрозадач: исход снятия проходит через несколько `await`.
 */
const flush = async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

type Setup = {
  /**
   * Подменить провайдер amo на поле ввода; undefined — рабочий провайдер.
   */
  client?: unknown;

  /**
   * Файлы в `<input>`; undefined — один GIF.
   */
  files?: unknown[];

  /**
   * Состояние store amo; undefined — открыт групповой чат.
   */
  state?: unknown;
};

const setup = (options: Setup = {}) => {
  const sendRequest = vi.fn(async (_request: AmoRequest): Promise<unknown> => {
    return undefined;
  });
  let current: unknown = amoState();

  const state = () => {
    return current;
  };

  const setState = (next: unknown) => {
    current = next;
  };

  const client =
    'client' in options
      ? options.client
      : {
          sendRequest,
          reduxStore: {
            getState: () => {
              return 'state' in options ? options.state : state();
            },
          },
        };
  const { leaf } = fiberChain(3, { value: client });
  const target = new FakeElement({ ...nodeWithFiber(leaf), textContent: DRAFT_TEXT });
  const file = new File([makeGif(8, 8)], 'a.amostk.k-sticker.gif', {
    type: 'image/gif',
  });
  const input = new FakeElement({ files: options.files || [file] });
  const doc = new FakeDocument([target, input]);
  const host: Pick<Window, '__amoStickersPage'> = {};
  const responses: unknown[] = [];
  const rawDetails: unknown[] = [];

  doc.addEventListener(PAGE_RESPONSE_EVENT, (event) => {
    rawDetails.push('detail' in event ? event.detail : null);
    responses.push(parsePageResponse(event));
  });
  startAgent(doc, host);

  const send = (id = 'cmd-1', detail?: string) => {
    target.setAttribute(PAGE_TARGET_ATTR, id);
    input.setAttribute(PAGE_FILE_ATTR, id);
    doc.dispatchEvent(
      new CustomEvent(PAGE_REQUEST_EVENT, {
        detail:
          detail === undefined ? JSON.stringify({ id, op: 'send', dims: DIMS }) : detail,
      })
    );
  };

  return {
    doc,
    file,
    host,
    input,
    rawDetails,
    responses,
    send,
    sendRequest,
    setState,
    target,
  };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const noop = () => {
  return undefined;
};

describe('startAgent', () => {
  it('отправляет файл в открытый чат и отвечает accepted синхронно', () => {
    const { file, responses, send, sendRequest } = setup();

    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'accepted' }]);
    expect(sendRequest).toHaveBeenCalledTimes(1);

    expect(sendRequest).toHaveBeenCalledWith({
      type: 'sendNewMessages',
      payload: {
        messages: [
          expect.objectContaining({
            conversationId: CHAT_ID,
            media: expect.objectContaining({ file }),
          }),
        ],
      },
    });
  });

  it('в ответе на странице только id и статус, без текста поля', () => {
    const { rawDetails, send } = setup();

    send();

    expect(rawDetails).toEqual([JSON.stringify({ id: 'cmd-1', status: 'accepted' })]);
    expect(String(rawDetails[0])).not.toContain(DRAFT_TEXT);
  });

  it('rejected no-client, если у значения провайдера не та форма, — без sendRequest', () => {
    const sendRequest = vi.fn();
    const { responses, send } = setup({ client: { sendRequest } });

    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'rejected', reason: 'no-client' }]);
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it.each([
    ['no-file', { files: [] }],
    ['no-file', { files: ['не файл'] }],
    ['no-conversation', { state: { location: { type: 'settings' } } }],
  ] satisfies [string, Setup][])('rejected %s без sendRequest', (reason, options) => {
    const { responses, send, sendRequest } = setup(options);

    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'rejected', reason }]);
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it('rejected no-target, если поле ввода не помечено этой командой', () => {
    const { doc, responses, sendRequest, target } = setup();

    target.setAttribute(PAGE_TARGET_ATTR, 'другая');
    doc.dispatchEvent(
      new CustomEvent(PAGE_REQUEST_EVENT, {
        detail: JSON.stringify({ id: 'cmd-1', op: 'send', dims: DIMS }),
      })
    );

    expect(responses).toEqual([{ id: 'cmd-1', status: 'rejected', reason: 'no-target' }]);
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it('rejected send-threw, если sendRequest бросил синхронно', () => {
    vi.spyOn(console, 'warn').mockImplementation(noop);

    const { responses, send } = setup({
      client: {
        sendRequest: () => {
          throw new Error('канал закрыт');
        },
        reduxStore: { getState: amoState },
      },
    });

    send();

    expect(responses).toEqual([
      { id: 'cmd-1', status: 'rejected', reason: 'send-threw' },
    ]);
  });

  it('rejected build-threw, если состояние amo не читается, — без sendRequest', () => {
    vi.spyOn(console, 'warn').mockImplementation(noop);

    const sendRequest = vi.fn();
    const { responses, send } = setup({
      client: {
        sendRequest,
        reduxStore: {
          getState: () => {
            throw new Error('store detached');
          },
        },
      },
    });

    send();

    expect(responses).toEqual([
      { id: 'cmd-1', status: 'rejected', reason: 'build-threw' },
    ]);
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it.each([
    ['неизвестная операция', JSON.stringify({ id: 'cmd-1', op: 'stash' })],
    ['не JSON', '{'],
  ])('невалидная команда (%s) — без ответа и без отправки', (_case, detail) => {
    const { responses, send, sendRequest } = setup();

    send('cmd-1', detail);

    expect(responses).toEqual([]);
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it('id со спецсимволами селектора не ломает поиск узлов', () => {
    const { responses, send, sendRequest } = setup();

    send('"] *');

    expect(responses).toEqual([{ id: '"] *', status: 'accepted' }]);
    expect(sendRequest).toHaveBeenCalledTimes(1);
  });

  it('второй запуск на той же странице не заводит второго слушателя', () => {
    const { doc, host, responses, send, sendRequest } = setup();

    startAgent(doc, host);
    send();

    expect(responses).toHaveLength(1);
    expect(sendRequest).toHaveBeenCalledTimes(1);
  });

  it('пишет в консоль, если amo вернул ошибку отправки', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
    const { send, sendRequest } = setup();

    sendRequest.mockResolvedValueOnce(new Error('aborted on signOut'));
    send();
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith(
      '[amo-stickers] amo rejected sticker send:',
      'aborted on signOut'
    );
  });
});

describe('startAgent: ответ на сообщение', () => {
  it('отправляет стикер ответом и снимает ответ после отправки, accepted синхронно', () => {
    const { responses, send, sendRequest, setState } = setup();

    setState(replyState());
    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'accepted' }]);
    expect(requestTypes(sendRequest)).toEqual([
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
    ]);
    expect(sendRequest).toHaveBeenNthCalledWith(1, {
      type: 'sendNewMessages',
      payload: {
        messages: [
          expect.objectContaining({
            refersTo: expect.objectContaining({ id: REPLY_ID }),
          }),
        ],
      },
    });
    expect(sendRequest).toHaveBeenNthCalledWith(2, CLEAR_REQUEST);
  });

  it.each([
    ['без ответа', amoState()],
    ['сообщение ответа не загружено', { ...replyState(), messages: {} }],
  ])('%s — один запрос, без снятия', (_case, state) => {
    const { responses, send, sendRequest, setState } = setup();

    setState(state);
    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'accepted' }]);
    expect(requestTypes(sendRequest)).toEqual(['sendNewMessages']);
  });

  it('в ответе на странице только id и статус, без сообщения ответа', () => {
    const { rawDetails, send, setState } = setup();

    setState(replyState());
    send();

    expect(rawDetails).toEqual([JSON.stringify({ id: 'cmd-1', status: 'accepted' })]);
  });

  it('снятие бросило — accepted, стикер отправлен один раз', () => {
    vi.spyOn(console, 'warn').mockImplementation(noop);

    const { responses, send, sendRequest, setState } = setup();

    sendRequest.mockImplementation((request) => {
      if (request.type === CLEAR_REQUEST.type) throw new Error('не дошло');

      return Promise.resolve(undefined);
    });
    setState(replyState());
    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'accepted' }]);
    expect(requestTypes(sendRequest)).toEqual([
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
    ]);
  });

  it('отправка бросила — rejected send-threw, ответ не снимается', () => {
    vi.spyOn(console, 'warn').mockImplementation(noop);

    const { responses, send, sendRequest, setState } = setup();

    sendRequest.mockImplementation(() => {
      throw new Error('канал закрыт');
    });
    setState(replyState());
    send();

    expect(responses).toEqual([
      { id: 'cmd-1', status: 'rejected', reason: 'send-threw' },
    ]);
    expect(requestTypes(sendRequest)).toEqual(['sendNewMessages']);
  });

  it('второй стикер, пока store показывает тот же ответ, — без цитаты и без второго снятия', () => {
    const { send, sendRequest, setState } = setup();

    setState(replyState());
    send('cmd-1');
    send('cmd-2');

    expect(requestTypes(sendRequest)).toEqual([
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
      'sendNewMessages',
    ]);
    expect(sendRequest.mock.calls[2]?.[0]).toEqual({
      type: 'sendNewMessages',
      payload: {
        messages: [expect.not.objectContaining({ refersTo: expect.anything() })],
      },
    });
  });

  it('после завершения снятия новый ответ на то же сообщение уходит с цитатой', async () => {
    const { send, sendRequest, setState } = setup();

    setState(replyState());
    send('cmd-1');
    await flush();
    send('cmd-2');

    expect(requestTypes(sendRequest)).toEqual([
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
    ]);
  });

  it('снятие зависло — через 10 с новый стикер снова ответом', async () => {
    vi.useFakeTimers();

    const { send, sendRequest, setState } = setup();

    sendRequest.mockImplementation(async (request) => {
      return request.type === CLEAR_REQUEST.type ? new Promise(noop) : undefined;
    });
    setState(replyState());
    send('cmd-1');
    await vi.advanceTimersByTimeAsync(9999);
    send('cmd-2');
    await vi.advanceTimersByTimeAsync(1);
    send('cmd-3');

    expect(requestTypes(sendRequest)).toEqual([
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
      'sendNewMessages',
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
    ]);
  });

  it('снятие завершилось после 10 с — не сбрасывает снятие следующего стикера', async () => {
    vi.useFakeTimers();

    const { send, sendRequest, setState } = setup();
    const settles: (() => void)[] = [];

    sendRequest.mockImplementation(async (request) => {
      if (request.type !== CLEAR_REQUEST.type) return undefined;

      return new Promise((resolve) => {
        settles.push(() => {
          resolve(undefined);
        });
      });
    });
    setState(replyState());
    send('cmd-1');
    await vi.advanceTimersByTimeAsync(10_000);
    send('cmd-2');
    settles[0]?.();
    await vi.advanceTimersByTimeAsync(0);
    send('cmd-3');

    expect(requestTypes(sendRequest)).toEqual([
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
      'sendNewMessages',
    ]);
  });

  it.each([
    [
      'бросило',
      () => {
        throw new Error('не дошло');
      },
    ],
    [
      'отказ промиса',
      async () => {
        throw new Error('aborted');
      },
    ],
    [
      'Error в результате',
      async () => {
        return new Error('aborted on signOut');
      },
    ],
  ])('снятие не удалось (%s) — следующий стикер снова ответом', async (_case, clear) => {
    vi.spyOn(console, 'warn').mockImplementation(noop);

    const { send, sendRequest, setState } = setup();

    sendRequest.mockImplementation((request) => {
      return request.type === CLEAR_REQUEST.type ? clear() : Promise.resolve(undefined);
    });
    setState(replyState());
    send('cmd-1');
    await flush();
    send('cmd-2');

    expect(requestTypes(sendRequest)).toEqual([
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
      'sendNewMessages',
      'updateConversationDraughtRefersToId',
    ]);
  });
});

const SEQ_MIN = 1_000_000_000;

/**
 * `InputEvent` для окружения `node`, где его нет: агент получает конструктор параметром.
 */
class FakeInputEvent extends Event {
  readonly inputType: string;

  constructor(type: string, init: InputEventInit = {}) {
    super(type, init);
    this.inputType = init.inputType || '';
  }
}

type WorkerSetup = {
  /**
   * Пропсы поля поверх рабочих: `edit`, `attached`.
   */
  compose?: Record<string, unknown>;

  /**
   * Полоса вложений `[data-attachments]` в капсуле.
   */
  hasAttachmentStrip?: boolean;

  /**
   * Текст в поле ввода.
   */
  text?: string;

  /**
   * Ядро страницы поймано.
   */
  hasCore?: boolean;

  /**
   * Fiber поля указывает на устаревшую копию с правкой, а текущая — `alternate`.
   */
  isFiberStale?: boolean;
};

/**
 * Колонка чата Worker-версии: лента `[role="log"]`, кнопки ленты с пропсами `down` на 4 шага fiber от кнопки,
 * полоса поля с капсулой и полем ввода с пропсами компонента поля на 5 шагов fiber — как в живой Worker-версии.
 *
 * @param options — что поменять в рабочей колонке
 * @returns колонка, ядро страницы, журнал вызовов и отправка команды
 */
const setupWorker = (options: WorkerSetup = {}) => {
  const log: string[] = [];
  const onDraftChange = vi.fn();
  const compose: Record<string, unknown> = {
    chat: CHAT_ID,
    onSend: vi.fn(),
    onFilesPick: vi.fn(),
    reply: null,
    edit: null,
    attached: false,
    draft: { text: '', entities: [] },
    onDraftChange,
    ...options.compose,
  };
  const fresh = fiberChain(5, compose);
  let fiber = fresh.leaf;

  if (options.isFiberStale) {
    const stale = fiberChain(5, { ...compose, chat: 'старый', edit: { key: 'm-1' } });

    stale.leaf.alternate = fresh.leaf;
    fresh.leaf.alternate = stale.leaf;
    fiber = stale.leaf;
  }

  const field = new FakePageNode(
    'div',
    { contenteditable: 'true', role: 'textbox' },
    { __reactFiber$w1: fiber, __reactProps$w1: fresh.leaf.memoizedProps }
  );

  field.textContent = options.text || '';

  field.onDispatch = (event) => {
    log.push(`${event.type}:${event instanceof FakeInputEvent ? event.inputType : ''}`);
  };

  const onDownClick = vi.fn();
  const feedButtons = {
    down: { shown: true, count: 0, label: 'Вниз', onClick: onDownClick },
    reactions: { shown: false, count: 0, label: '', onClick: vi.fn() },
    bottom: false,
  };
  const downButton = new FakePageNode(
    'button',
    {},
    { __reactFiber$w1: fiberChain(4, feedButtons).leaf }
  );
  const attachmentsSlot = new FakePageNode('div', { 'data-attachments-slot': '' });

  if (options.hasAttachmentStrip) {
    attachmentsSlot.append(new FakePageNode('div', { 'data-attachments': '' }));
  }

  const column = new FakePageNode('div').append(
    new FakePageNode('div', { role: 'log' }).append(new FakePageNode('button')),
    new FakePageNode('div').append(new FakePageNode('button'), downButton),
    new FakePageNode('div').append(
      new FakePageNode('div').append(
        new FakePageNode('div').append(
          new FakePageNode('div', { 'data-capsule-top': '' })
        ),
        attachmentsSlot,
        new FakePageNode('div').append(new FakePageNode('div').append(field))
      ),
      new FakePageNode('button')
    )
  );
  const file = new File([makeGif(8, 8)], 'a.amostk.k-sticker.gif', { type: 'image/gif' });
  const input = new FakeElement({ files: [file] });
  const doc = new FakeDocument([field, input]);
  const host = { Worker: FakeWorker, InputEvent: FakeInputEvent };
  const responses: unknown[] = [];
  const rawDetails: unknown[] = [];

  doc.addEventListener(PAGE_RESPONSE_EVENT, (event) => {
    rawDetails.push('detail' in event ? event.detail : null);
    responses.push(parsePageResponse(event));
  });
  startAgent(doc, host);

  const Created = host.Worker;
  const core = new Created('blob:core', { type: 'module' });

  if (!(core instanceof FakeWorker)) throw new Error('Worker не подменён');

  if (options.hasCore !== false) core.emit(CALL_LOADED);

  const postMessage = vi.spyOn(core, 'postMessage').mockImplementation((command) => {
    log.push(String(fieldOf(command, 'kind')));
  });

  const send = (id = 'cmd-1') => {
    field.setAttribute(PAGE_TARGET_ATTR, id);
    input.setAttribute(PAGE_FILE_ATTR, id);
    doc.dispatchEvent(
      new CustomEvent(PAGE_REQUEST_EVENT, {
        detail: JSON.stringify({ id, op: 'send', dims: { w: 300, h: 70 } }),
      })
    );
  };

  /**
   * @param index — номер команды ядру
   * @returns `seq` этой команды
   */
  const seqOf = (index = 0) => {
    const [command] = postMessage.mock.calls[index] || [];

    return fieldOf(command, 'seq');
  };

  return {
    column,
    compose,
    core,
    feedButtons,
    field,
    file,
    log,
    onDownClick,
    onDraftChange,
    postMessage,
    rawDetails,
    responses,
    send,
    seqOf,
  };
};

describe('startAgent: Worker-версия', () => {
  it('шлёт ядру sendFiles с одним GIF и сторонами из команды, accepted синхронно', () => {
    const { file, postMessage, responses, send } = setupWorker();

    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'accepted' }]);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      kind: 'sendFiles',
      chat: CHAT_ID,
      text: '',
      seq: SEQ_MIN,
      files: [
        {
          file: expect.any(String),
          bytes: file,
          kind: 'photo',
          name: 'a.amostk.k-sticker.gif',
          mime: 'image/gif',
          size: file.size,
          w: 300,
          h: 70,
          durationMs: 0,
        },
      ],
    });
  });

  it('каждой отправке — свой seq и свой file', () => {
    const { postMessage, send, seqOf } = setupWorker();

    send('cmd-1');
    send('cmd-2');

    const files = postMessage.mock.calls.map(([command]) => {
      return fieldOf(fieldOf(fieldOf(command, 'files'), '0'), 'file');
    });

    expect([seqOf(0), seqOf(1)]).toEqual([SEQ_MIN, SEQ_MIN + 1]);
    expect(new Set(files).size).toBe(2);
  });

  it('seq ходит по кругу в [10⁹, 2³²)', () => {
    expect(nextSeq(SEQ_MIN)).toBe(SEQ_MIN + 1);
    expect(nextSeq(2 ** 32 - 2)).toBe(2 ** 32 - 1);
    expect(nextSeq(2 ** 32 - 1)).toBe(SEQ_MIN);
  });

  it('пустое поле — без события ввода и без onDraftChange', () => {
    const { field, log, onDraftChange, send } = setupWorker();

    send();

    expect(log).toEqual(['sendFiles']);
    expect(field.dispatched).toEqual([]);
    expect(onDraftChange).not.toHaveBeenCalled();
  });

  it('текст в поле — сначала sendFiles, потом input с insertText, всплывающий', () => {
    const { field, log, onDraftChange, send } = setupWorker({ text: 'привет' });

    send();

    expect(log).toEqual(['sendFiles', 'input:insertText']);
    expect(field.dispatched[0]?.bubbles).toBe(true);
    expect(onDraftChange).not.toHaveBeenCalled();
  });

  it('в ответе на странице только id и статус, без текста поля', () => {
    const { rawDetails, send } = setupWorker({ text: DRAFT_TEXT });

    send();

    expect(rawDetails).toEqual([JSON.stringify({ id: 'cmd-1', status: 'accepted' })]);
  });

  it.each([
    ['идёт правка', { compose: { edit: { key: 'm-1' } } }],
    ['вложения в пропсах', { compose: { attached: true } }],
    ['полоса вложений в капсуле', { hasAttachmentStrip: true }],
  ] satisfies [string, WorkerSetup][])(
    '%s — rejected draft-busy без команды',
    (_case, options) => {
      const { postMessage, responses, send } = setupWorker({
        ...options,
        text: 'привет',
      });

      send();

      expect(responses).toEqual([
        { id: 'cmd-1', status: 'rejected', reason: 'draft-busy' },
      ]);
      expect(postMessage).not.toHaveBeenCalled();
    }
  );

  it('ядро не поймано — rejected no-core', () => {
    const { responses, send } = setupWorker({ hasCore: false });

    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'rejected', reason: 'no-core' }]);
  });

  it('пропсы поля — из актуальной копии fiber, а не из устаревшей', () => {
    const { postMessage, responses, send } = setupWorker({ isFiberStale: true });

    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'accepted' }]);
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ chat: CHAT_ID }));
  });

  it('postMessage бросил — rejected send-threw, без события ввода', () => {
    vi.spyOn(console, 'warn').mockImplementation(noop);

    const { field, postMessage, responses, send } = setupWorker({ text: 'привет' });

    postMessage.mockImplementation(() => {
      throw new Error('нельзя клонировать');
    });
    send();

    expect(responses).toEqual([
      { id: 'cmd-1', status: 'rejected', reason: 'send-threw' },
    ]);
    expect(field.dispatched).toEqual([]);
  });

  it('sent со своим seq и key в открытом чате — лента вниз, если кнопка показана', () => {
    const { core, onDownClick, send, seqOf } = setupWorker();

    send();
    core.emit({ kind: 'sent', chat: CHAT_ID, seq: seqOf(), key: 'k-1', refused: null });

    expect(onDownClick).toHaveBeenCalledTimes(1);
  });

  it('лента у низа (down.shown: false) — вниз не зовётся', () => {
    const { core, feedButtons, onDownClick, send, seqOf } = setupWorker();

    feedButtons.down.shown = false;
    send();
    core.emit({ kind: 'sent', chat: CHAT_ID, seq: seqOf(), key: 'k-1', refused: null });

    expect(onDownClick).not.toHaveBeenCalled();
  });

  it('sent с чужим seq или повтор своего — вниз не зовётся', () => {
    const { core, onDownClick, send, seqOf } = setupWorker();

    send();
    core.emit({ kind: 'sent', chat: CHAT_ID, seq: 5, key: 'k-0', refused: null });

    expect(onDownClick).not.toHaveBeenCalled();

    core.emit({ kind: 'sent', chat: CHAT_ID, seq: seqOf(), key: 'k-1', refused: null });
    core.emit({ kind: 'sent', chat: CHAT_ID, seq: seqOf(), key: 'k-1', refused: null });

    expect(onDownClick).toHaveBeenCalledTimes(1);
  });

  it('отправок без доклада больше границы — самая старая забыта, остальные ждут доклада', () => {
    const { core, onDownClick, send, seqOf } = setupWorker();

    for (let index = 0; index <= SENDING_MAX; index++) send(`cmd-${index}`);

    core.emit({ kind: 'sent', chat: CHAT_ID, seq: seqOf(0), key: 'k-0', refused: null });

    expect(onDownClick).not.toHaveBeenCalled();

    core.emit({ kind: 'sent', chat: CHAT_ID, seq: seqOf(1), key: 'k-1', refused: null });
    core.emit({
      kind: 'sent',
      chat: CHAT_ID,
      seq: seqOf(SENDING_MAX),
      key: 'k-last',
      refused: null,
    });

    expect(onDownClick).toHaveBeenCalledTimes(2);
  });

  it('открыт уже другой чат — вниз не зовётся', () => {
    const { compose, core, onDownClick, send, seqOf } = setupWorker();

    send();
    compose.chat = 'chat-2';
    core.emit({ kind: 'sent', chat: CHAT_ID, seq: seqOf(), key: 'k-1', refused: null });

    expect(onDownClick).not.toHaveBeenCalled();
  });

  it('доклад о другом чате — вниз не зовётся', () => {
    const { core, onDownClick, send, seqOf } = setupWorker();

    send();
    core.emit({ kind: 'sent', chat: 'chat-2', seq: seqOf(), key: 'k-1', refused: null });

    expect(onDownClick).not.toHaveBeenCalled();
  });

  it('поле ушло из документа — вниз не зовётся', () => {
    const { core, field, onDownClick, send, seqOf } = setupWorker();

    send();
    field.remove();
    core.emit({ kind: 'sent', chat: CHAT_ID, seq: seqOf(), key: 'k-1', refused: null });

    expect(onDownClick).not.toHaveBeenCalled();
  });

  it('возврат черновика бросил — предупреждение, стикер принят', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
    const failure = new Error('сбой');
    const { field, responses, send } = setupWorker({ text: 'привет' });

    field.onDispatch = () => {
      throw failure;
    };

    send();

    expect(responses).toEqual([{ id: 'cmd-1', status: 'accepted' }]);
    expect(warn).toHaveBeenCalledWith('[amo-stickers] draft restore failed:', failure);
  });

  it.each([
    ['отказ', { key: null, refused: 'tooBig' }],
    ['без key', { key: null, refused: null }],
  ])(
    'sent со своим seq: %s — предупреждение в консоли, вниз не зовётся',
    (_case, outcome) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
      const { core, onDownClick, send, seqOf } = setupWorker();

      send();
      core.emit({ kind: 'sent', chat: CHAT_ID, seq: seqOf(), ...outcome });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]).toContain(outcome.refused);
      expect(onDownClick).not.toHaveBeenCalled();
    }
  );

  it('пропсы поля бросают при чтении — отказ build-threw с предупреждением', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
    const fiber = {
      get memoizedProps() {
        throw new Error('сбой');
      },
    };
    const field = new FakePageNode('div', {}, { __reactFiber$w1: fiber });
    const input = new FakeElement({
      files: [new File([makeGif(8, 8)], 'a.amostk.k-sticker.gif', { type: 'image/gif' })],
    });
    const doc = new FakeDocument([field, input]);
    const responses: unknown[] = [];

    doc.addEventListener(PAGE_RESPONSE_EVENT, (event) => {
      responses.push(parsePageResponse(event));
    });
    startAgent(doc, { Worker: FakeWorker, InputEvent: FakeInputEvent });
    field.setAttribute(PAGE_TARGET_ATTR, 'cmd-1');
    input.setAttribute(PAGE_FILE_ATTR, 'cmd-1');
    doc.dispatchEvent(
      new CustomEvent(PAGE_REQUEST_EVENT, {
        detail: JSON.stringify({ id: 'cmd-1', op: 'send', dims: DIMS }),
      })
    );

    expect(responses).toEqual([
      { id: 'cmd-1', status: 'rejected', reason: 'build-threw' },
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('у поля без пропсов Worker-версии — прежний путь sendRequest', () => {
    const sendRequest = vi.fn(async (_request: AmoRequest): Promise<unknown> => {
      return undefined;
    });
    const client = { sendRequest, reduxStore: { getState: amoState } };
    const field = new FakePageNode(
      'div',
      {},
      { __reactFiber$w1: fiberChain(3, { value: client }).leaf }
    );
    const file = new File([makeGif(8, 8)], 'a.amostk.k-sticker.gif', {
      type: 'image/gif',
    });
    const input = new FakeElement({ files: [file] });
    const doc = new FakeDocument([field, input]);
    const responses: unknown[] = [];

    doc.addEventListener(PAGE_RESPONSE_EVENT, (event) => {
      responses.push(parsePageResponse(event));
    });
    startAgent(doc, { Worker: FakeWorker, InputEvent: FakeInputEvent });
    field.setAttribute(PAGE_TARGET_ATTR, 'cmd-1');
    input.setAttribute(PAGE_FILE_ATTR, 'cmd-1');
    doc.dispatchEvent(
      new CustomEvent(PAGE_REQUEST_EVENT, {
        detail: JSON.stringify({ id: 'cmd-1', op: 'send', dims: DIMS }),
      })
    );

    expect(responses).toEqual([{ id: 'cmd-1', status: 'accepted' }]);
    expect(requestTypes(sendRequest)).toEqual(['sendNewMessages']);
  });
});
