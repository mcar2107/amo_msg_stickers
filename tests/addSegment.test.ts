import { describe, expect, it } from 'vitest';

import { ADD_SEGMENTS, DEFAULT_ADD_SEGMENT, resolveAddSegment } from '@ui/usePickerView';

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
    expect(resolveAddSegment('file', 'custom')).toBe('custom');
  });

  it('«+» помнит сегмент «Файл»', () => {
    expect(resolveAddSegment('file', undefined)).toBe('file');
  });
});

describe('ADD_SEGMENTS', () => {
  it('три сегмента по порядку вкладок: «Файл» последний, на него ведёт `End`', () => {
    expect(ADD_SEGMENTS).toEqual(['telegram', 'custom', 'file']);
  });
});
