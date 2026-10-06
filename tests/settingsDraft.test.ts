import { describe, expect, it } from 'vitest';

import type { Settings } from '../src/core/host.types';
import {
  checkPlan,
  dropWritten,
  pendingWrite,
} from '../src/core/ui/Picker/SettingsView/settingsDraft/settingsDraft';

const SAVED: Settings = { giphyKey: 'g1', klipyKey: '', telegramToken: '123:abc' };

describe('pendingWrite', () => {
  it('без правок — писать нечего', () => {
    expect(pendingWrite(SAVED, {})).toBeNull();
  });

  it('правка, равная сохранённому без пробелов по краям, — писать нечего', () => {
    expect(pendingWrite(SAVED, { giphyKey: '  g1 ' })).toBeNull();
  });

  it('пишет только отличия и без пробелов по краям', () => {
    expect(pendingWrite(SAVED, { giphyKey: 'g1', klipyKey: ' k2 ' })).toEqual({
      klipyKey: 'k2',
    });
  });

  it('пустое значение — отсутствие ключа, оно тоже пишется', () => {
    expect(pendingWrite(SAVED, { telegramToken: '   ' })).toEqual({ telegramToken: '' });
  });
});

describe('dropWritten', () => {
  it('снимает записанные поля, а изменённые после записи оставляет', () => {
    expect(
      dropWritten({ giphyKey: 'g2', klipyKey: 'k3' }, { giphyKey: 'g2', klipyKey: 'k2' })
    ).toEqual({ klipyKey: 'k3' });
  });
});

describe('checkPlan', () => {
  it('проверяет непустое значение, отличное от проверенного', () => {
    const values: Settings = { giphyKey: 'g2', klipyKey: 'k1', telegramToken: '' };

    expect(checkPlan(values, { giphyKey: 'g1', klipyKey: 'k1' })).toEqual({
      keys: ['giphyKey'],
      checked: { giphyKey: 'g2', klipyKey: 'k1' },
    });
  });

  it('поля без правок в этом экране не проверяет', () => {
    expect(checkPlan(SAVED, {}).keys).toEqual([]);
  });

  it('повторная фиксация без правки не проверяет второй раз', () => {
    const values: Settings = { ...SAVED, giphyKey: 'g2' };
    const { checked } = checkPlan(values, { giphyKey: 'g1' });

    expect(checkPlan(values, checked).keys).toEqual([]);
  });

  it('пустое значение не проверяет, но запоминает', () => {
    const values: Settings = { ...SAVED, telegramToken: '' };

    expect(checkPlan(values, { telegramToken: '123:abc' })).toEqual({
      keys: [],
      checked: { telegramToken: '' },
    });
  });

  it('значение сравнивается без пробелов по краям', () => {
    const values: Settings = { ...SAVED, klipyKey: ' k1 ' };

    expect(checkPlan(values, { klipyKey: 'k1' }).keys).toEqual([]);
  });
});
