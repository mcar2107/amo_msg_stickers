import { describe, expect, it, vi } from 'vitest';

import { encodeLadder } from '../src/core/encodeLadder';
import type { EncodedPass } from '../src/core/encodeLadder.types';
import { MAX_GIF_BYTES, SAFETY, SAMPLE_FRAMES } from '../src/core/sidePick';

const MB = 1024 * 1024;

/**
 * Полный проход-заглушка: вес GIF задан по стороне, квадратный кадр.
 *
 * @param weights — вес готового GIF в байтах для каждой стороны
 * @returns проход, который пишет стороны своих вызовов в `mock.calls`
 */
const fakeEncode = (weights: Record<number, number>) => {
  return vi.fn(async (side: number): Promise<EncodedPass> => {
    return { bytes: new Uint8Array(weights[side] || 1), width: side, height: side };
  });
};

/**
 * Проба-заглушка: отдаёт такой вес, чтобы оценка для стороны источника без `SAFETY`
 * была `estimate` байт на плане из `frameCount` кадров.
 *
 * @param estimate — оценка веса GIF в стороне источника без запаса
 * @param frameCount — число кадров плана
 * @returns проба, которая пишет номера кадров своих вызовов в `mock.calls`
 */
const fakeSample = (estimate: number, frameCount: number) => {
  return vi.fn(async (indices: number[]) => {
    return (estimate / SAFETY / frameCount) * indices.length;
  });
};

describe('encodeLadder', () => {
  it('оценка ошиблась в меньшую сторону: второй проход в 384 px по источнику', async () => {
    const sample = fakeSample(1.5 * MB, 75);
    const encode = fakeEncode({ 512: 2.3 * MB, 384: 1.4 * MB });

    const result = await encodeLadder({ frameCount: 75, side: 512, sample, encode });

    expect(sample).toHaveBeenCalledTimes(1);
    expect(encode.mock.calls).toEqual([[512], [384]]);
    expect(result.width).toBe(384);
    expect(result.bytes.byteLength).toBeLessThanOrEqual(MAX_GIF_BYTES);
  });

  it('GIF ровно в лимит — без повторного прохода', async () => {
    const encode = fakeEncode({ 512: MAX_GIF_BYTES });

    const result = await encodeLadder({
      frameCount: 1,
      side: 512,
      sample: fakeSample(MB, 1),
      encode,
    });

    expect(encode.mock.calls).toEqual([[512]]);
    expect(result.width).toBe(512);
  });

  it('лимит недостижим: результат в 256 px сохраняется, несмотря на вес', async () => {
    const encode = fakeEncode({ 256: 2.2 * MB });

    const result = await encodeLadder({
      frameCount: 75,
      side: 512,
      sample: fakeSample(10 * MB, 75),
      encode,
    });

    expect(encode.mock.calls).toEqual([[256]]);
    expect(result.width).toBe(256);
    expect(result.bytes.byteLength).toBeGreaterThan(MAX_GIF_BYTES);
  });

  it('лимит недостижим и после оценки: лестница доходит до 256 px и останавливается', async () => {
    const encode = fakeEncode({ 512: 3 * MB, 384: 3 * MB, 320: 3 * MB, 256: 3 * MB });

    const result = await encodeLadder({
      frameCount: 75,
      side: 512,
      sample: fakeSample(MB, 75),
      encode,
    });

    expect(encode.mock.calls).toEqual([[512], [384], [320], [256]]);
    expect(result.width).toBe(256);
  });

  it('тяжёлая анимация: полный проход сразу в стороне по оценке', async () => {
    const sample = fakeSample(3 * MB, 75);
    const encode = fakeEncode({ 384: 1.6 * MB });

    const result = await encodeLadder({ frameCount: 75, side: 512, sample, encode });

    expect(sample.mock.calls).toEqual([[[0, 11, 21, 32, 42, 53, 63, 74]]]);
    expect(encode.mock.calls).toEqual([[384]]);
    expect(result.width).toBe(384);
  });

  it(`≤ ${SAMPLE_FRAMES} кадров — без пробы, сразу сторона источника`, async () => {
    const sample = fakeSample(10 * MB, SAMPLE_FRAMES);
    const encode = fakeEncode({ 512: MB });

    await encodeLadder({ frameCount: SAMPLE_FRAMES, side: 512, sample, encode });

    expect(sample).not.toHaveBeenCalled();
    expect(encode.mock.calls).toEqual([[512]]);
  });

  it('сторона 256 px и меньше — без пробы', async () => {
    const sample = fakeSample(10 * MB, 75);
    const encode = fakeEncode({ 200: 3 * MB });

    const result = await encodeLadder({ frameCount: 75, side: 200, sample, encode });

    expect(sample).not.toHaveBeenCalled();
    expect(encode.mock.calls).toEqual([[200]]);
    expect(result.width).toBe(200);
  });

  it('без пробы лестница всё равно уменьшает сторону', async () => {
    const encode = fakeEncode({ 512: 3 * MB, 384: MB });

    const result = await encodeLadder({
      frameCount: 1,
      side: 512,
      sample: fakeSample(MB, 1),
      encode,
    });

    expect(encode.mock.calls).toEqual([[512], [384]]);
    expect(result.width).toBe(384);
  });

  it('прерванный signal до пробы — ни пробы, ни прохода', async () => {
    const controller = new AbortController();
    const sample = fakeSample(MB, 75);
    const encode = fakeEncode({ 512: MB });

    controller.abort();

    await expect(
      encodeLadder({
        frameCount: 75,
        side: 512,
        sample,
        encode,
        signal: controller.signal,
      })
    ).rejects.toBe(controller.signal.reason);
    expect(sample).not.toHaveBeenCalled();
    expect(encode).not.toHaveBeenCalled();
  });

  it('отмена во время прохода не запускает следующий проход лестницы', async () => {
    const controller = new AbortController();
    const encode = vi.fn(async (side: number): Promise<EncodedPass> => {
      controller.abort();

      return { bytes: new Uint8Array(3 * MB), width: side, height: side };
    });

    await expect(
      encodeLadder({
        frameCount: 1,
        side: 512,
        sample: fakeSample(MB, 1),
        encode,
        signal: controller.signal,
      })
    ).rejects.toHaveProperty('name', 'AbortError');
    expect(encode.mock.calls).toEqual([[512]]);
  });

  it('отмена во время пробы не запускает полный проход', async () => {
    const controller = new AbortController();
    const sample = vi.fn(async () => {
      controller.abort();

      return MB;
    });
    const encode = fakeEncode({ 512: MB });

    await expect(
      encodeLadder({
        frameCount: 75,
        side: 512,
        sample,
        encode,
        signal: controller.signal,
      })
    ).rejects.toHaveProperty('name', 'AbortError');
    expect(encode).not.toHaveBeenCalled();
  });
});
