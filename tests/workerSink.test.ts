import { describe, expect, it, vi } from 'vitest';

import type { FrameSink } from '@core/frameSink.types';
import type { GifWorkerRequest, GifWorkerResponse } from '@core/gifWorker.types';
import type { WorkerPort } from '@core/workerSink.types';
import { createFallbackAwareSink, createWorkerSink } from '@core/workerSinkClient';

const SIZE = 2;
const DELAY_MS = 40;
const OPTIONS = { width: SIZE, height: SIZE, isAnimated: true };

/**
 * Кадр из пикселей одного цвета.
 *
 * @param value — значение каналов r, g, b
 * @returns rgba-буфер кадра `SIZE` × `SIZE`
 */
const frame = (value: number) => {
  return new Uint8ClampedArray(SIZE * SIZE * 4).fill(value);
};

/**
 * `ErrorEvent` для `node`, где его нет: Worker сообщает о сбое таким событием.
 */
class TestErrorEvent extends Event implements ErrorEvent {
  readonly colno = 0;
  readonly error = null;
  readonly filename = '';
  readonly lineno = 0;

  constructor(readonly message: string) {
    super('error');
  }
}

/**
 * Отправленное Worker-у сообщение вместе со списком передачи.
 */
type Sent = {
  /**
   * Сообщение Worker-у.
   */
  message: GifWorkerRequest;

  /**
   * Буферы, переданные без копии.
   */
  transfer: Transferable[];
};

/**
 * Фейковый Worker: пишет отправленное, отвечает и падает по команде теста.
 *
 * @returns порт Worker-а и управление им
 */
const fakeWorker = () => {
  const sent: Sent[] = [];
  const terminate = vi.fn();
  const port: WorkerPort = {
    postMessage: (message, transfer) => {
      sent.push({ message, transfer });
    },
    terminate,
    onmessage: null,
    onerror: null,
    onmessageerror: null,
  };

  /**
   * Ответ Worker-а главному потоку.
   *
   * @param data — сообщение Worker-а
   */
  const reply = (data: GifWorkerResponse) => {
    port.onmessage?.(new MessageEvent('message', { data }));
  };

  /**
   * Сбой Worker-а.
   */
  const crash = () => {
    port.onerror?.(new TestErrorEvent('boom'));
  };

  /**
   * Кадры, отправленные Worker-у.
   *
   * @returns сообщения `frame` со списками передачи
   */
  const frames = () => {
    return sent.filter(({ message }) => {
      return message.type === 'frame';
    });
  };

  return { port, sent, terminate, reply, crash, frames };
};

/**
 * Фейковый приёмник фолбэка: пишет принятые кадры и фиксирует `flush`.
 *
 * @returns приёмник и его журнал
 */
const fakeFallback = () => {
  const written: number[] = [];
  const close = vi.fn();
  const flush = vi.fn(async () => {});
  const sink: FrameSink = {
    write: async (rgba) => {
      written.push(rgba[0] || 0);
    },
    flush,
    get byteLength() {
      return written.length;
    },
    finish: async () => {
      return new Uint8Array(written);
    },
    close,
  };

  return { sink, written, close, flush };
};

/**
 * Клиент поверх фейков.
 *
 * @param maxInFlight — окно кадров без `ack`
 * @returns клиент, фейковый Worker, фолбэк и шпион `onFallback`
 */
const setup = (maxInFlight = 2) => {
  const worker = fakeWorker();
  const fallback = fakeFallback();
  const createFallback = vi.fn(() => {
    return fallback.sink;
  });
  const onFallback = vi.fn();
  const sink = createWorkerSink({
    options: OPTIONS,
    startWorker: () => {
      return worker.port;
    },
    createFallback,
    onFallback,
    maxInFlight,
  });

  return { sink, worker, fallback, createFallback, onFallback };
};

/**
 * Состояние промиса без ожидания: разрешён ли он к текущей микрозадаче.
 *
 * @param promise — проверяемый промис
 * @returns true, если промис уже разрешён
 */
const isSettled = async (promise: Promise<unknown>) => {
  let isDone = false;

  void promise.then(
    () => {
      isDone = true;
    },
    () => {
      isDone = true;
    }
  );
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  return isDone;
};

describe('createWorkerSink', () => {
  it('начинает проход сообщением start с размером кадра', () => {
    const { worker } = setup();

    expect(worker.sent[0]?.message).toEqual({ type: 'start', ...OPTIONS });
  });

  it('первый кадр ждёт свой ack и уходит копией: его можно повторить в фолбэке', async () => {
    const { sink, worker } = setup();
    const written = sink.write(frame(1), DELAY_MS);

    expect(worker.frames()[0]?.transfer).toEqual([]);
    expect(await isSettled(written)).toBe(false);

    worker.reply({ type: 'ack', byteLength: 10 });
    await written;
    expect(sink.byteLength).toBe(10);
  });

  it('после первого ack держит в полёте не больше maxInFlight кадров, буфер — transfer', async () => {
    const { sink, worker } = setup(2);
    let acked = 0;
    let maxInFlight = 0;

    const first = sink.write(frame(1), DELAY_MS);

    worker.reply({ type: 'ack', byteLength: 1 });
    acked += 1;
    await first;

    for (let i = 2; i <= 6; i += 1) {
      const rgba = frame(i);
      const written = sink.write(rgba, DELAY_MS);

      maxInFlight = Math.max(maxInFlight, worker.frames().length - acked);
      expect(worker.frames().at(-1)?.transfer).toEqual([rgba.buffer]);

      if (!(await isSettled(written))) {
        worker.reply({ type: 'ack', byteLength: i });
        acked += 1;
        await written;
      }
    }

    expect(maxInFlight).toBe(2);
    expect(worker.frames()).toHaveLength(6);
  });

  it('при окне 2 flush ждёт ack последнего кадра — проба читает полный вес', async () => {
    const { sink, worker } = setup(2);
    const first = sink.write(frame(1), DELAY_MS);

    worker.reply({ type: 'ack', byteLength: 100 });
    await first;
    await sink.write(frame(2), DELAY_MS);

    const third = sink.write(frame(3), DELAY_MS);
    const flushed = sink.flush();

    expect(await isSettled(flushed)).toBe(false);

    worker.reply({ type: 'ack', byteLength: 200 });
    await third;
    expect(await isSettled(flushed)).toBe(false);

    worker.reply({ type: 'ack', byteLength: 300 });
    await flushed;
    expect(sink.byteLength).toBe(300);
  });

  it('flush без кадров в полёте разрешается сразу', async () => {
    const { sink, worker } = setup();

    expect(await isSettled(sink.flush())).toBe(true);

    const written = sink.write(frame(1), DELAY_MS);

    worker.reply({ type: 'ack', byteLength: 10 });
    await written;
    expect(await isSettled(sink.flush())).toBe(true);
  });

  it('flush отклоняется при сбое Worker-а после первого ack', async () => {
    const { sink, worker } = setup();
    const first = sink.write(frame(1), DELAY_MS);

    worker.reply({ type: 'ack', byteLength: 1 });
    await first;
    await sink.write(frame(2), DELAY_MS);

    const flushed = sink.flush();

    worker.crash();

    await expect(flushed).rejects.toThrow('boom');
    await expect(sink.flush()).rejects.toThrow('boom');
  });

  it('flush после close отклоняется', async () => {
    const { sink } = setup();

    sink.close();

    await expect(sink.flush()).rejects.toThrow('closed');
  });

  it('flush, заставший сбой Worker-а до первого ack, ждёт повтора кадра и flush фолбэка', async () => {
    const { sink, worker, fallback } = setup();
    const written = sink.write(frame(5), DELAY_MS);
    const flushed = sink.flush().then(() => {
      return [...fallback.written];
    });

    expect(await isSettled(flushed)).toBe(false);

    worker.crash();
    await written;

    expect(await flushed).toEqual([5]);
    expect(fallback.flush).toHaveBeenCalledOnce();
    expect(sink.byteLength).toBe(1);
  });

  it('finish отдаёт байты из done, close останавливает Worker', async () => {
    const { sink, worker } = setup();
    const written = sink.write(frame(1), DELAY_MS);

    worker.reply({ type: 'ack', byteLength: 1 });
    await written;

    const finished = sink.finish();

    expect(worker.sent.at(-1)?.message).toEqual({ type: 'finish' });

    const bytes = new Uint8Array([71, 73, 70]);

    worker.reply({ type: 'done', bytes });
    expect(await finished).toBe(bytes);

    sink.close();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('сбой Worker-а до первого ack — фолбэк повторяет отправленный кадр и принимает дальше', async () => {
    const { sink, worker, fallback, createFallback, onFallback } = setup();
    const written = sink.write(frame(7), DELAY_MS);

    worker.crash();
    await written;

    expect(createFallback).toHaveBeenCalledWith(OPTIONS);
    expect(onFallback).toHaveBeenCalledOnce();
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(fallback.written).toEqual([7]);

    await sink.write(frame(8), DELAY_MS);
    expect(fallback.written).toEqual([7, 8]);
    expect(worker.frames()).toHaveLength(1);
    expect(sink.byteLength).toBe(2);
    expect(await sink.finish()).toEqual(new Uint8Array([7, 8]));

    sink.close();
    expect(fallback.close).toHaveBeenCalledOnce();
  });

  it('исключение конструктора Worker-а — сразу фолбэк', async () => {
    const fallback = fakeFallback();
    const onFallback = vi.fn();
    const sink = createWorkerSink({
      options: OPTIONS,
      startWorker: () => {
        throw new Error('CSP');
      },
      createFallback: () => {
        return fallback.sink;
      },
      onFallback,
      maxInFlight: 2,
    });

    await sink.write(frame(3), DELAY_MS);

    expect(onFallback).toHaveBeenCalledOnce();
    expect(fallback.written).toEqual([3]);
  });

  it('сбой Worker-а после первого ack — ошибка конвертации, без фолбэка', async () => {
    const { sink, worker, createFallback, onFallback } = setup();
    const first = sink.write(frame(1), DELAY_MS);

    worker.reply({ type: 'ack', byteLength: 1 });
    await first;

    const second = sink.write(frame(2), DELAY_MS);

    await second;

    const third = sink.write(frame(3), DELAY_MS);

    worker.crash();

    await expect(third).rejects.toThrow('boom');
    await expect(sink.write(frame(4), DELAY_MS)).rejects.toThrow('boom');
    await expect(sink.finish()).rejects.toThrow('boom');
    expect(createFallback).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('сообщение error от Worker-а — ошибка конвертации даже до первого ack', async () => {
    const { sink, worker, createFallback } = setup();
    const written = sink.write(frame(1), DELAY_MS);

    worker.reply({ type: 'error', message: 'encode failed' });

    await expect(written).rejects.toThrow('encode failed');
    expect(createFallback).not.toHaveBeenCalled();
  });

  it('finish, заставший сбой Worker-а до первого ack, отдаёт GIF фолбэка', async () => {
    const { sink, worker, fallback } = setup();
    const written = sink.write(frame(5), DELAY_MS);
    const finished = sink.finish();

    worker.crash();
    await written;

    expect(await finished).toEqual(new Uint8Array([5]));
    expect(fallback.written).toEqual([5]);
  });

  it('сбой во время finish — finish отклоняется', async () => {
    const { sink, worker } = setup();
    const written = sink.write(frame(1), DELAY_MS);

    worker.reply({ type: 'ack', byteLength: 1 });
    await written;

    const finished = sink.finish();

    worker.crash();
    await expect(finished).rejects.toThrow('boom');
  });
});

/**
 * Фабрика поверх фейков: каждый запуск Worker-а отдаёт новый фейк.
 *
 * @param startWorker — запуск Worker-а
 * @returns фабрика, фолбэк и шпионы запуска и уведомления
 */
const setupFactory = (startWorker: () => WorkerPort) => {
  const fallback = fakeFallback();
  const start = vi.fn(startWorker);
  const createFallback = vi.fn(() => {
    return fallback.sink;
  });
  const onFallback = vi.fn();
  const createSink = createFallbackAwareSink({
    startWorker: start,
    createFallback,
    onFallback,
    maxInFlight: 1,
  });

  return { createSink, fallback, start, createFallback, onFallback };
};

describe('createFallbackAwareSink', () => {
  it('без сбоя каждый проход запускает свой Worker', () => {
    const { createSink, start, createFallback } = setupFactory(() => {
      return fakeWorker().port;
    });

    createSink(OPTIONS);
    createSink(OPTIONS);

    expect(start).toHaveBeenCalledTimes(2);
    expect(createFallback).not.toHaveBeenCalled();
  });

  it('после сбоя Worker-а до первого ack следующий приёмник сразу пишет в фолбэк', async () => {
    const workers: ReturnType<typeof fakeWorker>[] = [];
    const { createSink, fallback, start, onFallback } = setupFactory(() => {
      const worker = fakeWorker();

      workers.push(worker);

      return worker.port;
    });
    const first = createSink(OPTIONS);
    const written = first.write(frame(1), DELAY_MS);

    workers[0]?.crash();
    await written;
    first.close();

    const second = createSink(OPTIONS);

    await second.write(frame(2), DELAY_MS);

    expect(start).toHaveBeenCalledOnce();
    expect(onFallback).toHaveBeenCalledOnce();
    expect(fallback.written).toEqual([1, 2]);
  });

  it('после исключения конструктора Worker-а следующий приёмник его не запускает', async () => {
    const { createSink, fallback, start } = setupFactory(() => {
      throw new Error('CSP');
    });

    await createSink(OPTIONS).write(frame(1), DELAY_MS);
    await createSink(OPTIONS).write(frame(2), DELAY_MS);

    expect(start).toHaveBeenCalledOnce();
    expect(fallback.written).toEqual([1, 2]);
  });

  it('сбой после первого ack флаг не ставит: следующий проход снова пробует Worker', async () => {
    const workers: ReturnType<typeof fakeWorker>[] = [];
    const { createSink, start } = setupFactory(() => {
      const worker = fakeWorker();

      workers.push(worker);

      return worker.port;
    });
    const first = createSink(OPTIONS);
    const written = first.write(frame(1), DELAY_MS);

    workers[0]?.reply({ type: 'ack', byteLength: 1 });
    await written;
    workers[0]?.crash();
    first.close();

    createSink(OPTIONS);

    expect(start).toHaveBeenCalledTimes(2);
  });
});
