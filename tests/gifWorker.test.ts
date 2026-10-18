import { describe, expect, it } from 'vitest';

import { createGifWorkerHandler } from '@core/gifWorker';
import type { GifWorkerResponse } from '@core/gifWorker.types';

import { solidFrame } from './helpers';

const SIZE = 4;
const DELAY_MS = 40;
const GIF_SIGNATURE = 'GIF89a';

/**
 * Ответ обработчика вместе со списком передаваемых буферов.
 */
type Posted = {
  /**
   * Сообщение главному потоку.
   */
  message: GifWorkerResponse;

  /**
   * Буферы, переданные без копирования.
   */
  transfer: Transferable[];
};

/**
 * Обработчик с записью всех ответов и списков передачи.
 *
 * @returns обработчик и журнал его ответов
 */
const setup = () => {
  const posted: Posted[] = [];
  const handle = createGifWorkerHandler((message, transfer = []) => {
    posted.push({ message, transfer });
  });

  return { handle, posted };
};

const START = { type: 'start', width: SIZE, height: SIZE, isAnimated: true } as const;

describe('createGifWorkerHandler', () => {
  it('отвечает ack с растущим весом на каждый кадр и done с GIF по finish', () => {
    const { handle, posted } = setup();

    handle(START);
    handle({ type: 'frame', rgba: solidFrame(SIZE, 10), delayMs: DELAY_MS });
    handle({ type: 'frame', rgba: solidFrame(SIZE, 200), delayMs: DELAY_MS });

    const [first, second] = posted.map(({ message }) => {
      return message;
    });

    expect(first).toMatchObject({ type: 'ack' });
    expect(second).toMatchObject({ type: 'ack' });

    if (first?.type !== 'ack' || second?.type !== 'ack') throw new Error('ожидались ack');

    expect(first.byteLength).toBeGreaterThan(0);
    expect(second.byteLength).toBeGreaterThan(first.byteLength);

    handle({ type: 'finish' });

    const done = posted.at(-1);

    if (done?.message.type !== 'done') throw new Error('ожидался done');

    const { bytes } = done.message;

    expect(new TextDecoder().decode(bytes.subarray(0, GIF_SIGNATURE.length))).toBe(
      GIF_SIGNATURE
    );
    expect(done.transfer).toEqual([bytes.buffer]);
  });

  it('новый start начинает новый GIF: пробный и полный проход в одном Worker-е', () => {
    const { handle, posted } = setup();

    handle(START);
    handle({ type: 'frame', rgba: solidFrame(SIZE, 10), delayMs: DELAY_MS });
    handle({ type: 'frame', rgba: solidFrame(SIZE, 200), delayMs: DELAY_MS });
    handle(START);
    handle({ type: 'frame', rgba: solidFrame(SIZE, 10), delayMs: DELAY_MS });

    const acks = posted.map(({ message }) => {
      return message.type === 'ack' ? message.byteLength : -1;
    });

    expect(acks).toHaveLength(3);
    expect(acks[2]).toBe(acks[0]);
  });

  it('кадр до start — error, без ack', () => {
    const { handle, posted } = setup();

    handle({ type: 'frame', rgba: solidFrame(SIZE, 10), delayMs: DELAY_MS });

    expect(posted).toHaveLength(1);
    expect(posted[0]?.message).toMatchObject({ type: 'error' });
  });

  it('кадр после finish — error: закрытый GIF не дописывается', () => {
    const { handle, posted } = setup();

    handle(START);
    handle({ type: 'frame', rgba: solidFrame(SIZE, 10), delayMs: DELAY_MS });
    handle({ type: 'finish' });
    handle({ type: 'frame', rgba: solidFrame(SIZE, 10), delayMs: DELAY_MS });

    expect(
      posted.map(({ message }) => {
        return message.type;
      })
    ).toEqual(['ack', 'done', 'error']);
  });
});
