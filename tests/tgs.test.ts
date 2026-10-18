import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '@core/i18n';
import { readTgs } from '@core/tgs';

import { gzip } from './helpers';

const LOTTIE = { w: 512, h: 512, fr: 60, ip: 0, op: 180, layers: [] };

describe('readTgs', () => {
  it('принимает корректный Lottie', async () => {
    await expect(readTgs(await gzip(JSON.stringify(LOTTIE)))).resolves.toEqual(LOTTIE);
  });

  it('принимает Lottie без fr', async () => {
    const { fr: _fr, ...withoutFr } = LOTTIE;

    await expect(readTgs(await gzip(JSON.stringify(withoutFr)))).resolves.toEqual(
      withoutFr
    );
  });

  it('прерывает распаковку zip-бомбы', async () => {
    const bomb = await gzip(new Uint8Array(50 * 1024 * 1024));

    expect(bomb.size).toBeLessThan(100 * 1024);
    await expect(readTgs(bomb)).rejects.toThrow('Файл больше 8 МБ');
  });

  it.each([
    { w: 512, h: 512 },
    { ...LOTTIE, w: 0 },
    { ...LOTTIE, h: 10_000 },
    { ...LOTTIE, fr: 1000 },
    { ...LOTTIE, op: 0 },
    { ...LOTTIE, layers: {} },
    [],
  ])('отклоняет не-Lottie %j', async (json) => {
    await expect(readTgs(await gzip(JSON.stringify(json)))).rejects.toThrow(
      'Файл .tgs не похож на Lottie-анимацию'
    );
  });

  it('отклоняет gzip не с JSON', async () => {
    await expect(readTgs(await gzip('not json'))).rejects.toThrow(
      'Файл .tgs не похож на Lottie-анимацию'
    );
  });

  it('отклоняет не-gzip', async () => {
    await expect(readTgs(new Blob(['{"w":1}']))).rejects.toThrow('Файл .tgs повреждён');
  });

  it('в английском интерфейсе отклоняет не-gzip с английским текстом', async () => {
    setLocale('en');

    await expect(readTgs(new Blob(['{"w":1}']))).rejects.toThrow(
      'The .tgs file is corrupted'
    );
  });
});

afterEach(() => {
  setLocale('ru');
});
