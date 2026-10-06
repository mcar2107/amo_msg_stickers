import { afterEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../src/core/i18n/translate';
import {
  finishImport,
  importErrorTarget,
} from '../src/core/ui/Picker/PickerProvider/finishImport/finishImport';
import type { SectionMotion } from '../src/core/ui/Picker/usePickerView/usePickerView.types';

const PACK = { id: 'tg:cats', title: 'Коты' };

/**
 * Колбэки провайдера с общим журналом вызовов: порядок перехода и статуса важен.
 *
 * @returns колбэки и журнал
 */
const callbacks = () => {
  const calls: string[] = [];
  const scrollToSection = vi.fn((sectionId: string, motion: SectionMotion) => {
    calls.push(`scroll ${sectionId} ${motion}`);
  });
  const showStatus = vi.fn((text: string) => {
    calls.push(`status ${text}`);
  });

  return { calls, scrollToSection, showStatus };
};

afterEach(() => {
  setLocale('ru');
});

describe('finishImport', () => {
  it('экран «Добавить» открыт — мгновенный переход к паку, затем статус', () => {
    const { calls, scrollToSection, showStatus } = callbacks();

    finishImport({ screen: 'add', pack: PACK, scrollToSection, showStatus });

    expect(calls).toEqual(['scroll tg:cats instant', 'status Пак «Коты» добавлен']);
  });

  it('экран «Добавить» закрыт — только статус, лента не двигается', () => {
    const { calls, scrollToSection, showStatus } = callbacks();

    finishImport({ screen: null, pack: PACK, scrollToSection, showStatus });

    expect(scrollToSection).not.toHaveBeenCalled();
    expect(calls).toEqual(['status Пак «Коты» добавлен']);
  });

  it('открыт другой экран — только статус', () => {
    const { scrollToSection, showStatus } = callbacks();

    finishImport({ screen: 'settings', pack: PACK, scrollToSection, showStatus });

    expect(scrollToSection).not.toHaveBeenCalled();
    expect(showStatus).toHaveBeenCalledTimes(1);
  });

  it('на английском — английский статус, название пака без перевода', () => {
    setLocale('en');

    const { showStatus, scrollToSection } = callbacks();

    finishImport({ screen: null, pack: PACK, scrollToSection, showStatus });

    expect(showStatus).toHaveBeenCalledWith('Pack “Коты” added');
  });
});

describe('importErrorTarget', () => {
  it('экран «Добавить стикеры» на сегменте «Telegram» — ошибка у поля', () => {
    expect(importErrorTarget('add', 'telegram')).toBe('field');
  });

  it('экран «Добавить стикеры» на другом сегменте — статус', () => {
    expect(importErrorTarget('add', 'custom')).toBe('status');
  });

  it('другой экран — статус', () => {
    expect(importErrorTarget('settings', 'telegram')).toBe('status');
  });

  it('экрана нет — статус', () => {
    expect(importErrorTarget(null, 'telegram')).toBe('status');
  });
});
