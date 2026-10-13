/**
 * `Worker` страницы без потока: что пришло в конструктор, `postMessage` и `terminate`, а сообщения и ошибки
 * подаёт тест. `onmessage` вызывается, как у настоящего Worker-а, рядом со слушателями.
 */
export class FakeWorker extends EventTarget {
  readonly args: unknown[];

  readonly posted: unknown[][] = [];

  terminated = 0;

  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(...args: [string | URL, WorkerOptions?]) {
    super();
    this.args = args;
  }

  postMessage(...args: unknown[]) {
    this.posted.push(args);
  }

  terminate() {
    this.terminated++;
  }

  emit(data: unknown) {
    const event = new MessageEvent('message', { data });

    this.onmessage?.(event);
    this.dispatchEvent(event);
  }

  fail() {
    this.dispatchEvent(new Event('error'));
  }
}

/**
 * Первое сообщение ядра страницы в живой Worker-версии — запись журнала о загрузке.
 */
export const CALL_LOADED = { kind: 'call', dir: 'out', name: 'loaded', at: 1 };
