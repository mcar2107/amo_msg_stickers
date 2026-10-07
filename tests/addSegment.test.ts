import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ADD_SEGMENT,
  resolveAddSegment,
} from '../src/core/ui/Picker/usePickerView/addSegment';

describe('resolveAddSegment', () => {
  it('без выбора на странице открывается «Telegram»', () => {
    expect(DEFAULT_ADD_SEGMENT).toBe('telegram');
  });

  it('«+» без сегмента оставляет последний выбранный', () => {
    expect(resolveAddSegment('custom', undefined)).toBe('custom');
    expect(resolveAddSegment('telegram', undefined)).toBe('telegram');
  });

  it('плитка открывает «Свой стикер» при любом прежнем выборе', () => {
    expect(resolveAddSegment('telegram', 'custom')).toBe('custom');
    expect(resolveAddSegment('custom', 'custom')).toBe('custom');
  });
});
