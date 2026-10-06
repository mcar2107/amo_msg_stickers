import { describe, expect, it } from 'vitest';

import { fieldCheckTone } from '../src/core/ui/Picker/SettingsView/fieldCheckTone/fieldCheckTone';

describe('fieldCheckTone', () => {
  it('принятый ключ — зелёный тон', () => {
    expect(fieldCheckTone('ok')).toBe('valid');
  });

  it('отказ источника и токен не того вида — тон ошибки', () => {
    expect(fieldCheckTone('rejected')).toBe('invalid');
    expect(fieldCheckTone('badFormat')).toBe('invalid');
  });

  it('без проверки, во время проверки и при сбое проверки тона нет', () => {
    expect(fieldCheckTone(undefined)).toBeNull();
    expect(fieldCheckTone('checking')).toBeNull();
    expect(fieldCheckTone('unavailable')).toBeNull();
  });
});
