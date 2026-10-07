import { describe, expect, it } from 'vitest';

import type { Pack } from '../src/core/db.types';
import { orderPacks, packSnapshot } from '../src/core/packOrder';

/**
 * Пак Telegram с заданными временами.
 *
 * @param name — имя набора, из него id `tg:<имя>`
 * @param createdAt — время импорта
 * @param usedAt — время последнего использования; не передано — пак не использован
 * @returns запись пака
 */
const tg = (name: string, createdAt: number, usedAt?: number): Pack => {
  const pack: Pack = { id: `tg:${name}`, title: name, source: 'telegram', createdAt };

  if (usedAt !== undefined) pack.usedAt = usedAt;

  return pack;
};

const CUSTOM: Pack = {
  id: 'custom',
  title: 'Мои стикеры',
  source: 'custom',
  createdAt: 0,
};

/**
 * Id паков по порядку — так результат сравнивается короче.
 *
 * @param packs — паки
 * @returns их id
 */
const ids = (packs: Pack[]) => {
  return packs.map(({ id }) => {
    return id;
  });
};

describe('orderPacks на открытии (без снимка)', () => {
  it('свой пак — первым, даже если паки Telegram использованы позже', () => {
    const packs = [tg('a', 1, 500), { ...CUSTOM, usedAt: 10 }, tg('b', 2, 900)];

    expect(ids(orderPacks(packs, null))).toEqual(['custom', 'tg:b', 'tg:a']);
  });

  it('паки Telegram — по usedAt от недавнего к давнему', () => {
    const packs = [tg('a', 1, 100), tg('b', 2, 300), tg('c', 3, 200)];

    expect(ids(orderPacks(packs, null))).toEqual(['tg:b', 'tg:c', 'tg:a']);
  });

  it('паки без usedAt — после использованных, между собой по createdAt', () => {
    const packs = [tg('b', 20), tg('c', 30, 5), tg('a', 10)];

    expect(ids(orderPacks(packs, null))).toEqual(['tg:c', 'tg:a', 'tg:b']);
  });

  it('равные usedAt — по createdAt', () => {
    const packs = [tg('b', 20, 100), tg('a', 10, 100)];

    expect(ids(orderPacks(packs, null))).toEqual(['tg:a', 'tg:b']);
  });

  it('библиотека без usedAt — порядок импорта', () => {
    const packs = [tg('c', 30), CUSTOM, tg('a', 10), tg('b', 20)];

    expect(ids(orderPacks(packs, null))).toEqual(['custom', 'tg:a', 'tg:b', 'tg:c']);
  });
});

describe('orderPacks в открытом попапе (по снимку)', () => {
  it('снимок держит порядок, хотя usedAt изменились', () => {
    const packs = [CUSTOM, tg('a', 1, 100), tg('b', 2, 200), tg('c', 3, 999)];

    expect(ids(orderPacks(packs, ['tg:b', 'tg:a', 'tg:c']))).toEqual([
      'custom',
      'tg:b',
      'tg:a',
      'tg:c',
    ]);
  });

  it('пак не из снимка — первым среди паков Telegram', () => {
    const packs = [CUSTOM, tg('a', 1, 100), tg('b', 2, 200), tg('new', 3, 50)];

    expect(ids(orderPacks(packs, ['tg:b', 'tg:a']))).toEqual([
      'custom',
      'tg:new',
      'tg:b',
      'tg:a',
    ]);
  });

  it('новые паки между собой — тем же правилом, что на открытии', () => {
    const packs = [tg('a', 1, 100), tg('x', 5), tg('y', 6, 300), tg('z', 4)];

    expect(ids(orderPacks(packs, ['tg:a']))).toEqual(['tg:y', 'tg:z', 'tg:x', 'tg:a']);
  });

  it('удалённый id снимка пропускается', () => {
    const packs = [CUSTOM, tg('a', 1, 100), tg('c', 3, 300)];

    expect(ids(orderPacks(packs, ['tg:c', 'tg:b', 'tg:a']))).toEqual([
      'custom',
      'tg:c',
      'tg:a',
    ]);
  });

  it('свой пак — первым и по снимку, в котором его нет', () => {
    const packs = [tg('a', 1, 100), CUSTOM];

    expect(ids(orderPacks(packs, ['tg:a']))).toEqual(['custom', 'tg:a']);
  });
});

describe('orderPacks не меняет вход', () => {
  it('массив и записи остаются прежними, результат — новый массив', () => {
    const a = Object.freeze(tg('a', 1, 100));
    const b = Object.freeze(tg('b', 2, 200));
    const packs = Object.freeze([a, b]);

    const ordered = orderPacks(packs, null);

    expect(ids(ordered)).toEqual(['tg:b', 'tg:a']);
    expect(ids([...packs])).toEqual(['tg:a', 'tg:b']);
    expect(ordered).not.toBe(packs);
    expect(orderPacks(packs, ['tg:a', 'tg:b'])).not.toBe(packs);
  });
});

describe('packSnapshot', () => {
  it('id паков Telegram в порядке показа, без своего пака', () => {
    const packs = [CUSTOM, tg('b', 2), tg('a', 1)];

    expect(packSnapshot(packs)).toEqual(['tg:b', 'tg:a']);
  });

  it('снимок результата держит этот же порядок на следующем перечитывании', () => {
    const shown = orderPacks([CUSTOM, tg('a', 1, 100), tg('b', 2, 200)], null);
    const reread = [CUSTOM, tg('a', 1, 999), tg('b', 2, 200)];

    expect(ids(orderPacks(reread, packSnapshot(shown)))).toEqual(ids(shown));
  });
});
