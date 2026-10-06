import { describe, expect, it } from 'vitest';

import {
  fieldDescribedBy,
  fieldDescriptionIds,
} from '../src/core/ui/Picker/Field/fieldDescription/fieldDescription';

describe('fieldDescriptionIds', () => {
  it('выводит id описаний из id поля', () => {
    expect(fieldDescriptionIds('klipy')).toEqual({
      error: 'klipy-error',
      result: 'klipy-result',
      hint: 'klipy-hint',
    });
  });
});

describe('fieldDescribedBy', () => {
  it('без описаний — пустая строка', () => {
    expect(
      fieldDescribedBy('f', { hasError: false, hasResult: false, hasHint: false })
    ).toBe('');
  });

  it('ошибка, результат проверки, подсказка — в порядке показа под полем', () => {
    expect(
      fieldDescribedBy('f', { hasError: true, hasResult: true, hasHint: true })
    ).toBe('f-error f-result f-hint');
  });

  it('берёт только показанные описания', () => {
    expect(
      fieldDescribedBy('f', { hasError: false, hasResult: true, hasHint: false })
    ).toBe('f-result');
  });

  it('внешние описания идут после своих', () => {
    expect(
      fieldDescribedBy('f', {
        hasError: false,
        hasResult: false,
        hasHint: true,
        describedBy: 'howto',
      })
    ).toBe('f-hint howto');
  });
});
