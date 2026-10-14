import { describe, expect, it } from 'vitest';

import { resolveDarkTheme } from '../src/core/amoDom';
import type { ThemeSignals } from '../src/core/amoDom.types';

const NONE: ThemeSignals = {
  hasDarkClass: false,
  themeAttr: null,
  hasWorkerComposer: false,
  isSystemDark: false,
};

describe('resolveDarkTheme', () => {
  it.each<[string, Partial<ThemeSignals>, boolean]>([
    [
      'класс dark — тёмная при любом атрибуте',
      { hasDarkClass: true, themeAttr: 'light' },
      true,
    ],
    ['data-amo-theme="dark" — тёмная', { themeAttr: 'dark' }, true],
    [
      'data-amo-theme="light" важнее тёмной системы у Worker-версии',
      { themeAttr: 'light', hasWorkerComposer: true, isSystemDark: true },
      false,
    ],
    [
      'без класса и атрибута у поля Worker-версии — системная тёмная',
      { hasWorkerComposer: true, isSystemDark: true },
      true,
    ],
    [
      'без класса и атрибута у поля Worker-версии — системная светлая',
      { hasWorkerComposer: true },
      false,
    ],
    ['без поля Worker-версии тёмная система не берётся', { isSystemDark: true }, false],
    [
      'незнакомое значение атрибута — дальше по порядку',
      { themeAttr: 'auto', hasWorkerComposer: true, isSystemDark: true },
      true,
    ],
    ['ничего — светлая', {}, false],
  ])('%s', (_case, signals, isDark) => {
    expect(resolveDarkTheme({ ...NONE, ...signals })).toBe(isDark);
  });
});
