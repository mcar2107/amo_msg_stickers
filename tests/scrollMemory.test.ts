import { describe, expect, it } from 'vitest';

import type { ScrollBox } from '@ui/ModePanel/scrollMemory';
import { createScrollMemory } from '@ui/ModePanel/scrollMemory';

/**
 * Прокручиваемый элемент без браузера.
 *
 * @param scrollTop — начальная прокрутка
 * @returns элемент в документе
 */
const box = (scrollTop = 0): ScrollBox => {
  return { scrollTop, isConnected: true };
};

describe('createScrollMemory', () => {
  it('восстанавливает прокрутку, сброшенную скрытием', () => {
    const memory = createScrollMemory();
    const feed = box(340);

    memory.remember(feed);
    feed.scrollTop = 0;
    memory.restore();

    expect(feed.scrollTop).toBe(340);
  });

  it('помнит последнюю прокрутку каждого элемента', () => {
    const memory = createScrollMemory();
    const feed = box(100);
    const chips = box(20);

    memory.remember(feed);
    memory.remember(chips);
    feed.scrollTop = 250;
    memory.remember(feed);
    feed.scrollTop = 0;
    chips.scrollTop = 0;
    memory.restore();

    expect(feed.scrollTop).toBe(250);
    expect(chips.scrollTop).toBe(20);
  });

  it('элемент, ушедший из документа, не восстанавливается и забывается', () => {
    const memory = createScrollMemory();
    const gone = { scrollTop: 80, isConnected: true };

    memory.remember(gone);
    gone.isConnected = false;
    gone.scrollTop = 0;
    memory.restore();

    expect(gone.scrollTop).toBe(0);

    gone.isConnected = true;
    memory.restore();

    expect(gone.scrollTop).toBe(0);
  });

  it('без запомненной прокрутки ничего не меняет', () => {
    const memory = createScrollMemory();
    const feed = box(15);

    memory.restore();

    expect(feed.scrollTop).toBe(15);
  });
});
