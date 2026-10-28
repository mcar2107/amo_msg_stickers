import type { GifEncoderOptions } from './gifEncoder.types';

/**
 * Начало прохода: Worker заводит новый GIF, прежний (пробный или недописанный)
 * выбрасывается.
 */
type GifWorkerStart = GifEncoderOptions & {
  /**
   * Вид сообщения.
   */
  type: 'start';
};

/**
 * Кадр прохода. Буфер `rgba` передаётся без копии (transfer): у главного потока он
 * после отправки пуст. Исключение — кадр до первого `ack`: он уходит копией и остаётся
 * у главного потока, чтобы повторить его в фолбэке, если Worker так и не заработал.
 */
type GifWorkerFrame = {
  /**
   * Вид сообщения.
   */
  type: 'frame';

  /**
   * Пиксели кадра, 4 байта на пиксель.
   */
  rgba: Uint8ClampedArray;

  /**
   * Длительность показа кадра в мс.
   */
  delayMs: number;
};

/**
 * Конец прохода: Worker закрывает GIF и отвечает `done`.
 */
type GifWorkerFinish = {
  /**
   * Вид сообщения.
   */
  type: 'finish';
};

/**
 * Сообщения главного потока Worker-у.
 */
export type GifWorkerRequest = GifWorkerStart | GifWorkerFrame | GifWorkerFinish;

/**
 * Кадр закодирован; следующий можно слать.
 */
type GifWorkerAck = {
  /**
   * Вид сообщения.
   */
  type: 'ack';

  /**
   * Вес GIF в байтах по уже закодированным кадрам.
   */
  byteLength: number;
};

/**
 * Готовый GIF прохода; буфер `bytes` передаётся без копии.
 */
type GifWorkerDone = {
  /**
   * Вид сообщения.
   */
  type: 'done';

  /**
   * Байты GIF.
   */
  bytes: Uint8Array<ArrayBuffer>;
};

/**
 * Сообщение не обработано: проход дальше не идёт.
 */
type GifWorkerError = {
  /**
   * Вид сообщения.
   */
  type: 'error';

  /**
   * Текст ошибки для диагностики.
   */
  message: string;
};

/**
 * Ответы Worker-а главному потоку.
 */
export type GifWorkerResponse = GifWorkerAck | GifWorkerDone | GifWorkerError;

/**
 * Отправка ответа главному потоку; `transfer` — буферы, которые уходят без копии.
 */
export type GifWorkerPost = (
  message: GifWorkerResponse,
  transfer?: Transferable[]
) => void;
