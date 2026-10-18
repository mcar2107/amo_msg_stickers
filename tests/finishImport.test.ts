import { afterEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../src/core/i18n/translate';
import {
  finishImport,
  importErrorTarget,
} from '../src/core/ui/Picker/PickerProvider/finishImport/finishImport';
import type {
  SectionMotion,
  SectionScrollOptions,
} from '../src/core/ui/Picker/usePickerView/usePickerView.types';

const PACK = { id: 'tg:cats', title: 'Коты' };

/**
 * Колбэки провайдера с общим журналом вызовов: порядок перехода и статуса важен.
 *
 * @returns колбэки и журнал
 */
const callbacks = () => {
  const calls: string[] = [];
  const scrollToSection = vi.fn(
    (sectionId: string, motion: SectionMotion, options: SectionScrollOptions = {}) => {
      calls.push(
        `scroll ${sectionId} ${motion}${options.shouldFocusTab ? ' focus-tab' : ''}`
      );
    }
  );
  const showStatus = vi.fn((text: string) => {
    calls.push(`status ${text}`);
  });

  return { calls, scrollToSection, showStatus };
};

afterEach(() => {
  setLocale('ru');
});

describe('finishImport', () => {
  it('экран «Добавить» открыт — мгновенный переход к паку с фокусом на его вкладку, затем статус', () => {
    const { calls, scrollToSection, showStatus } = callbacks();

    finishImport({ screen: 'add', pack: PACK, scrollToSection, showStatus });

    expect(calls).toEqual([
      'scroll tg:cats instant focus-tab',
      'status Пак «Коты» добавлен',
    ]);
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
  it('экран «Добавить стикеры» на сегменте «Telegram» — ошибка импорта Telegram у поля', () => {
    expect(importErrorTarget('add', 'telegram', 'telegram')).toBe('field');
  });

  it('экран «Добавить стикеры» на сегменте «Файл» — ошибка импорта файла у зоны', () => {
    expect(importErrorTarget('add', 'file', 'file')).toBe('field');
  });

  it('экран «Добавить стикеры» на чужом сегменте — статус', () => {
    expect(importErrorTarget('add', 'custom', 'telegram')).toBe('status');
    expect(importErrorTarget('add', 'file', 'telegram')).toBe('status');
    expect(importErrorTarget('add', 'telegram', 'file')).toBe('status');
  });

  it('другой экран — статус', () => {
    expect(importErrorTarget('settings', 'telegram', 'telegram')).toBe('status');
    expect(importErrorTarget('settings', 'file', 'file')).toBe('status');
  });

  it('экрана нет — статус', () => {
    expect(importErrorTarget(null, 'telegram', 'telegram')).toBe('status');
    expect(importErrorTarget(null, 'file', 'file')).toBe('status');
  });
});
