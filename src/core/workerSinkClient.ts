import type { FrameSink } from './frameSink.types';
import type { GifEncoderOptions } from './gifEncoder.types';
import type { GifWorkerResponse } from './gifWorker.types';
import { t } from './i18n';
import type {
  Deferred,
  RetainedFrame,
  WorkerPort,
  WorkerSinkDeps,
  WorkerSinkFactoryDeps,
} from './workerSink.types';

const CLOSED_MESSAGE = 'GIF worker: sink is closed';

/**
 * Причина отказа как `Error`: `Deferred.reject` принимает только его, а упасть может
 * что угодно.
 *
 * @param error — пойманное значение
 * @returns само значение, если это `Error`, иначе `Error` с его строкой
 */
const toError = (error: unknown) => {
  return error instanceof Error ? error : new Error(String(error));
};

/**
 * Создаёт промис с внешним разрешением.
 *
 * @returns промис и функции его разрешения
 */
const defer = <T>(): Deferred<T> => {
  let resolve: (value: T) => void = () => {};

  let reject: (reason: Error) => void = () => {};

  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });

  return { promise, resolve, reject };
};

/**
 * Буфер кадра для передачи без копии; буфер `SharedArrayBuffer` передать нельзя — он
 * уходит копией.
 *
 * @param rgba — пиксели кадра
 * @returns список передачи
 */
const transferOf = (rgba: Uint8ClampedArray): Transferable[] => {
  return rgba.buffer instanceof ArrayBuffer ? [rgba.buffer] : [];
};

/**
 * Приёмник кадров, кодирующий в Worker-е.
 *
 * Кадры уходят Worker-у без копии, `write` разрешается, когда без `ack` в полёте
 * меньше `maxInFlight` кадров: захват не обгоняет кодирование, и кадры не копятся в
 * очереди сообщений Worker-а. При окне больше одного кадра `byteLength` сразу после
 * `write` отстаёт на кадры в полёте; `flush` разрешается, когда `ack` пришёл на каждый
 * отданный кадр, и после него вес полный.
 *
 * До первого `ack` Worker ещё не доказал, что работает: окно — один кадр, и уходит
 * он копией. Сбой Worker-а в это время (CSP не дала загрузить скрипт, исключение
 * конструктора) переводит проход на `createFallback` с повтором этого кадра и зовёт
 * `onFallback`. Сбой после первого `ack` и сообщение `error` — ошибка конвертации: при
 * падении Worker-а по памяти кадры не кодируются второй раз на главном потоке.
 *
 * @param deps — размер кадра, запуск Worker-а, фолбэк и окно кадров
 * @returns приёмник кадров
 */
export const createWorkerSink = ({
  options,
  startWorker,
  createFallback,
  onFallback,
  maxInFlight,
}: WorkerSinkDeps): FrameSink => {
  let worker: WorkerPort | undefined;
  let fallback: FrameSink | undefined;
  let failure: Error | undefined;
  let hasAck = false;
  let inFlight = 0;
  let byteLength = 0;
  let retained: RetainedFrame | undefined;
  let replay: Promise<void> = Promise.resolve();
  const slotWaiters: Deferred<void>[] = [];
  const flushWaiters: Deferred<void>[] = [];
  let finishWaiter: Deferred<Uint8Array<ArrayBuffer>> | undefined;

  /**
   * Останавливает Worker и отвязывает обработчики: поздние события остановленного
   * Worker-а проход не трогают.
   */
  const stopWorker = () => {
    if (!worker) return;

    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
    worker = undefined;
  };

  /**
   * Будит `write`, для которых освободилось место в окне.
   */
  const releaseSlots = () => {
    const limit = hasAck ? maxInFlight : 1;

    while (inFlight < limit) {
      const waiter = slotWaiters.shift();

      if (!waiter) return;

      waiter.resolve();
    }
  };

  /**
   * Будит `flush`, когда без `ack` не осталось ни одного кадра.
   */
  const releaseFlushes = () => {
    if (inFlight > 0) return;

    for (const waiter of flushWaiters.splice(0)) waiter.resolve();
  };

  /**
   * Проход провален: ждущие `write`, `flush` и `finish` отклоняются, дальнейшие вызовы —
   * тоже.
   *
   * @param error — причина
   */
  const fail = (error: Error) => {
    failure = error;
    stopWorker();

    for (const waiter of slotWaiters.splice(0)) waiter.reject(error);

    for (const waiter of flushWaiters.splice(0)) waiter.reject(error);

    finishWaiter?.reject(error);
    finishWaiter = undefined;
  };

  /**
   * Будит `write`, ждавшие Worker, когда фолбэк повторил отправленный Worker-у кадр.
   * Ожидания `flush` сюда не входят: повтора кадра им мало, они ждут опустошения самого
   * фолбэка (`flushInFallback`).
   *
   * @param waiters — ожидания окна, заведённые до перехода на фолбэк
   */
  const releaseAfterReplay = async (waiters: Deferred<void>[]) => {
    try {
      await replay;

      for (const waiter of waiters) waiter.resolve();
    } catch (error) {
      const reason = toError(error);

      for (const waiter of waiters) waiter.reject(reason);
    }
  };

  /**
   * Кадр фолбэку — после повтора кадра, отправленного Worker-у.
   *
   * @param sink — приёмник фолбэка
   * @param rgba — пиксели кадра
   * @param delayMs — длительность показа кадра в мс
   */
  const writeToFallback = async (
    sink: FrameSink,
    rgba: Uint8ClampedArray,
    delayMs: number
  ) => {
    await replay;
    await sink.write(rgba, delayMs);
  };

  /**
   * Опустошение фолбэка — после повтора кадра, отправленного Worker-у. Ждём `flush`
   * фолбэка, а не только повтор: контракт не держится на том, что фолбэк кодирует кадр
   * внутри `write`.
   *
   * @param sink — приёмник фолбэка
   */
  const flushFallback = async (sink: FrameSink) => {
    await replay;
    await sink.flush();
  };

  /**
   * Будит `flush`, ждавшие Worker, когда опустел фолбэк: иначе они ждали бы `ack` от
   * остановленного Worker-а вечно.
   *
   * @param waiters — ожидания `flush`, заведённые до перехода на фолбэк
   * @param sink — приёмник фолбэка
   */
  const flushInFallback = async (waiters: Deferred<void>[], sink: FrameSink) => {
    try {
      await flushFallback(sink);

      for (const waiter of waiters) waiter.resolve();
    } catch (error) {
      const reason = toError(error);

      for (const waiter of waiters) waiter.reject(reason);
    }
  };

  /**
   * Готовый GIF фолбэка — после повтора кадра, отправленного Worker-у.
   *
   * @param sink — приёмник фолбэка
   * @returns байты GIF
   */
  const finishFallback = async (sink: FrameSink) => {
    await replay;

    return sink.finish();
  };

  /**
   * Отдаёт `finish`, ждавшему Worker, готовый GIF фолбэка: иначе он ждал бы `done` от
   * остановленного Worker-а вечно.
   *
   * @param waiter — ожидание `finish`, заведённое до перехода на фолбэк
   * @param sink — приёмник фолбэка
   */
  const finishInFallback = async (
    waiter: Deferred<Uint8Array<ArrayBuffer>>,
    sink: FrameSink
  ) => {
    try {
      waiter.resolve(await finishFallback(sink));
    } catch (error) {
      waiter.reject(toError(error));
    }
  };

  /**
   * Переводит проход на главный поток и повторяет в нём кадр, отправленный Worker-у.
   *
   * @param reason — почему Worker не заработал
   */
  const switchToFallback = (reason: unknown) => {
    stopWorker();
    onFallback(reason);

    const sink = createFallback(options);
    const frame = retained;

    fallback = sink;
    retained = undefined;
    inFlight = 0;
    replay = frame ? sink.write(frame.rgba, frame.delayMs) : Promise.resolve();

    void releaseAfterReplay(slotWaiters.splice(0));
    void flushInFallback(flushWaiters.splice(0), sink);

    const waiter = finishWaiter;

    finishWaiter = undefined;

    if (waiter) void finishInFallback(waiter, sink);
  };

  /**
   * Ответ Worker-а.
   *
   * @param event — сообщение Worker-а
   */
  const handleMessage = ({ data }: MessageEvent<GifWorkerResponse>) => {
    switch (data.type) {
      case 'ack': {
        hasAck = true;
        retained = undefined;
        inFlight -= 1;
        byteLength = data.byteLength;
        releaseSlots();
        releaseFlushes();

        return;
      }

      case 'done': {
        finishWaiter?.resolve(data.bytes);
        finishWaiter = undefined;

        return;
      }

      case 'error': {
        fail(new Error(data.message));

        return;
      }

      default: {
        const unknownResponse: never = data;
        const { type }: Pick<GifWorkerResponse, 'type'> = unknownResponse;

        fail(new Error(`GIF worker: unknown response type ${type}`));
      }
    }
  };

  /**
   * Сбой Worker-а вне протокола: до первого `ack` — фолбэк, после — ошибка прохода.
   *
   * @param event — событие ошибки Worker-а
   */
  const handleError = (event: ErrorEvent) => {
    if (hasAck) {
      fail(new Error(event.message || t('error.convert.workerCrashed')));

      return;
    }

    switchToFallback(event.message || 'GIF worker failed to start');
  };

  try {
    const started = startWorker();

    worker = started;
    started.onmessage = handleMessage;
    started.onerror = handleError;

    started.onmessageerror = () => {
      fail(new Error('GIF worker: unreadable message'));
    };

    started.postMessage({ type: 'start', ...options }, []);
  } catch (error) {
    switchToFallback(error);
  }

  return {
    write: (rgba, delayMs) => {
      if (fallback) return writeToFallback(fallback, rgba, delayMs);

      if (failure) return Promise.reject(failure);

      if (!worker) return Promise.reject(new Error(CLOSED_MESSAGE));

      if (hasAck) {
        worker.postMessage({ type: 'frame', rgba, delayMs }, transferOf(rgba));
      } else {
        retained = { rgba, delayMs };
        worker.postMessage({ type: 'frame', rgba, delayMs }, []);
      }

      inFlight += 1;

      const waiter = defer<void>();

      slotWaiters.push(waiter);
      releaseSlots();

      return waiter.promise;
    },
    flush: () => {
      if (fallback) return flushFallback(fallback);

      if (failure) return Promise.reject(failure);

      if (!worker) return Promise.reject(new Error(CLOSED_MESSAGE));

      if (inFlight === 0) return Promise.resolve();

      const waiter = defer<void>();

      flushWaiters.push(waiter);

      return waiter.promise;
    },
    get byteLength() {
      return fallback ? fallback.byteLength : byteLength;
    },
    finish: () => {
      if (fallback) return finishFallback(fallback);

      if (failure) return Promise.reject(failure);

      if (!worker) return Promise.reject(new Error(CLOSED_MESSAGE));

      finishWaiter = defer<Uint8Array<ArrayBuffer>>();
      worker.postMessage({ type: 'finish' }, []);

      return finishWaiter.promise;
    },
    close: () => {
      stopWorker();
      fallback?.close();
    },
  };
};

/**
 * Фабрика приёмников с памятью о сбое Worker-а. Worker не заработал в одном проходе —
 * все следующие приёмники этой фабрики сразу пишут в фолбэк, без повторного запуска
 * Worker-а и его задержки. Фабрика одна на страницу, поэтому флаг живёт до её
 * перезагрузки.
 *
 * @param deps — запуск Worker-а, фолбэк, уведомление о сбое и окно кадров
 * @returns создание приёмника прохода по размеру кадра
 */
export const createFallbackAwareSink = ({
  onFallback,
  createFallback,
  ...deps
}: WorkerSinkFactoryDeps) => {
  let isWorkerBroken = false;

  /**
   * Запоминает сбой Worker-а и передаёт его причину дальше.
   *
   * @param reason — исключение конструктора или текст сбоя Worker-а
   */
  const markWorkerBroken = (reason: unknown) => {
    isWorkerBroken = true;
    onFallback(reason);
  };

  return (options: GifEncoderOptions): FrameSink => {
    if (isWorkerBroken) return createFallback(options);

    return createWorkerSink({
      ...deps,
      options,
      createFallback,
      onFallback: markWorkerBroken,
    });
  };
};
