import { describe, expect, it } from 'vitest';

import { previewDirection } from '../src/core/ui/Picker/Preview/previewDirection/previewDirection';

describe('previewDirection', () => {
  it.each([
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
  ] as const)('%s — направление %s', (key, direction) => {
    expect(previewDirection(key)).toBe(direction);
  });

  it.each(['Escape', 'Enter', ' ', 'Tab', 'Home', 'End', 'PageDown', 'a', 'Left', ''])(
    'клавиша %j — не направление',
    (key) => {
      expect(previewDirection(key)).toBeNull();
    }
  );
});
