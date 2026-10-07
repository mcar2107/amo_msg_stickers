import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHoverPopup } from '../src/core/hoverPopup';
import type { OpenedBy, PanelPhase } from '../src/core/hoverPopup.types';
import { createPopupHolds } from '../src/core/hoverPopupHolds';
import { createPanelPhase } from '../src/core/hoverPopupPhase';

/**
 * Удержания нет: уход курсора закрывает попап.
 */
const NOT_HELD = () => {
  return false;
};

/**
 * Кнопки стикеров двух полей ввода на одной странице.
 */
const A = 'a';
const B = 'b';

/**
 * Контроллер с задержками спеки и записью колбэков.
 *
 * @param isHeld — удержание попапа
 * @returns контроллер и журнал открытий и закрытий
 */
const setup = (isHeld: () => boolean = NOT_HELD) => {
  const opened: OpenedBy[] = [];
  const openedAt: string[] = [];
  let closed = 0;
  const popup = createHoverPopup<string>({
    openDelay: 250,
    closeDelay: 500,
    onOpen: (openedBy, target) => {
      opened.push(openedBy);
      openedAt.push(target);
    },
    onClose: () => {
      closed += 1;
    },
    isHeld,
  });

  return {
    popup,
    opened,
    openedAt,
    closedCount: () => {
      return closed;
    },
  };
};

describe('createHoverPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('открывает наведением через 250 мс', () => {
    const { popup, opened } = setup();

    popup.enter(A);
    vi.advanceTimersByTime(249);
    expect(opened).toEqual([]);
    expect(popup.isOpen).toBe(false);
    vi.advanceTimersByTime(1);
    expect(opened).toEqual(['hover']);
    expect(popup.isOpen).toBe(true);
  });

  it('курсор, прошедший кнопку быстрее 250 мс, попап не открывает', () => {
    const { popup, opened } = setup();

    popup.enter(A);
    vi.advanceTimersByTime(200);
    popup.leave();
    vi.advanceTimersByTime(1000);
    expect(opened).toEqual([]);
    expect(popup.isOpen).toBe(false);
  });

  it('закрывает открытый наведением через 500 мс после ухода', () => {
    const { popup, closedCount } = setup();

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.leave();
    vi.advanceTimersByTime(499);
    expect(closedCount()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(closedCount()).toBe(1);
    expect(popup.isOpen).toBe(false);
  });

  it('возврат до конца задержки отменяет закрытие', () => {
    const { popup, closedCount } = setup();

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.leave();
    vi.advanceTimersByTime(400);
    popup.enter(A);
    vi.advanceTimersByTime(1000);
    expect(closedCount()).toBe(0);
    expect(popup.isOpen).toBe(true);
  });

  it('повторный уход не продлевает задержку закрытия', () => {
    const { popup, closedCount } = setup();

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.leave();
    vi.advanceTimersByTime(300);
    popup.leave();
    vi.advanceTimersByTime(200);
    expect(closedCount()).toBe(1);
  });

  it('клик открывает закреплённым сразу, уход курсора его не закрывает', () => {
    const { popup, opened, closedCount } = setup();

    popup.enter(A);
    popup.click(A);
    expect(opened).toEqual(['click']);
    popup.leave();
    vi.advanceTimersByTime(5000);
    expect(opened).toEqual(['click']);
    expect(closedCount()).toBe(0);
    expect(popup.isOpen).toBe(true);
  });

  it('клик по открытому наведением закрепляет его', () => {
    const { popup, opened, closedCount } = setup();

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.click(A);
    popup.leave();
    vi.advanceTimersByTime(5000);
    expect(opened).toEqual(['hover']);
    expect(closedCount()).toBe(0);
  });

  it('клик по открытому наведением отменяет уже запущенное закрытие', () => {
    const { popup, closedCount } = setup();

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.leave();
    vi.advanceTimersByTime(100);
    popup.click(A);
    vi.advanceTimersByTime(5000);
    expect(closedCount()).toBe(0);
  });

  it('повторный клик закрывает закреплённый, курсор на кнопке его снова не открывает', () => {
    const { popup, opened, closedCount } = setup();

    popup.enter(A);
    popup.click(A);
    popup.click(A);
    vi.advanceTimersByTime(5000);
    expect(closedCount()).toBe(1);
    expect(opened).toEqual(['click']);
    expect(popup.isOpen).toBe(false);
  });

  it('isHeld, ставший true после ухода, отменяет закрытие', () => {
    let isHeld = false;
    const { popup, closedCount } = setup(() => {
      return isHeld;
    });

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.leave();
    vi.advanceTimersByTime(100);
    isHeld = true;
    vi.advanceTimersByTime(1000);
    expect(closedCount()).toBe(0);
    expect(popup.isOpen).toBe(true);
  });

  it('после снятия удержания следующий уход закрывает', () => {
    let isHeld = true;
    const { popup, closedCount } = setup(() => {
      return isHeld;
    });

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.leave();
    vi.advanceTimersByTime(1000);
    isHeld = false;
    popup.enter(A);
    popup.leave();
    vi.advanceTimersByTime(500);
    expect(closedCount()).toBe(1);
  });

  it('снятие удержания при курсоре снаружи закрывает открытый наведением через 500 мс', () => {
    let isHeld = true;
    const { popup, closedCount } = setup(() => {
      return isHeld;
    });

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.leave();
    vi.advanceTimersByTime(1000);
    isHeld = false;
    popup.release();
    vi.advanceTimersByTime(499);
    expect(popup.isOpen).toBe(true);
    vi.advanceTimersByTime(1);
    expect(closedCount()).toBe(1);
    expect(popup.isOpen).toBe(false);
  });

  it('снятие удержания при курсоре внутри попап не закрывает', () => {
    let isHeld = true;
    const { popup, closedCount } = setup(() => {
      return isHeld;
    });

    popup.enter(A);
    vi.advanceTimersByTime(250);
    isHeld = false;
    popup.release();
    vi.advanceTimersByTime(1000);
    expect(closedCount()).toBe(0);
    expect(popup.isOpen).toBe(true);
  });

  it('снятие удержания у закреплённого попап не закрывает', () => {
    let isHeld = true;
    const { popup, closedCount } = setup(() => {
      return isHeld;
    });

    popup.enter(A);
    popup.click(A);
    popup.leave();
    isHeld = false;
    popup.release();
    vi.advanceTimersByTime(1000);
    expect(closedCount()).toBe(0);
    expect(popup.isOpen).toBe(true);
  });

  it('наведение на другую кнопку не закрывает закреплённый попап', () => {
    const { popup, opened, closedCount } = setup();

    popup.enter(A);
    popup.click(A);
    popup.leave();
    popup.enter(B);
    vi.advanceTimersByTime(1000);
    popup.leave();
    vi.advanceTimersByTime(1000);
    expect(closedCount()).toBe(0);
    expect(opened).toEqual(['click']);
    expect(popup.isOpen).toBe(true);
  });

  it('клик по другой кнопке переносит закреплённый попап к ней', () => {
    const { popup, opened, openedAt, closedCount } = setup();

    popup.click(A);
    popup.leave();
    popup.enter(B);
    popup.click(B);
    expect(closedCount()).toBe(1);
    expect(opened).toEqual(['click', 'click']);
    expect(openedAt).toEqual([A, B]);
    expect(popup.isOpen).toBe(true);
    popup.leave();
    vi.advanceTimersByTime(1000);
    expect(popup.isOpen).toBe(true);
  });

  it('наведение на другую кнопку закрывает открытый наведением и открывает у неё', () => {
    const { popup, openedAt, closedCount } = setup();

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.leave();
    popup.enter(B);
    expect(closedCount()).toBe(1);
    expect(popup.isOpen).toBe(false);
    vi.advanceTimersByTime(250);
    expect(openedAt).toEqual([A, B]);
    expect(popup.isOpen).toBe(true);
  });

  it('dismiss закрывает всегда: при удержании и у закреплённого', () => {
    const { popup, closedCount } = setup(() => {
      return true;
    });

    popup.click(A);
    popup.dismiss();
    expect(closedCount()).toBe(1);
    expect(popup.isOpen).toBe(false);
  });

  it('dismiss отменяет ожидающее открытие, а у закрытого не зовёт onClose', () => {
    const { popup, opened, closedCount } = setup();

    popup.enter(A);
    popup.dismiss();
    vi.advanceTimersByTime(1000);
    expect(opened).toEqual([]);
    expect(closedCount()).toBe(0);
  });

  it('dismiss изнутри onClose не закрывает второй раз', () => {
    let closed = 0;
    const popup = createHoverPopup({
      openDelay: 250,
      closeDelay: 500,
      onOpen: () => {},
      onClose: () => {
        closed += 1;
        popup.dismiss();
      },
      isHeld: () => {
        return false;
      },
    });

    popup.click(A);
    popup.dismiss();
    expect(closed).toBe(1);
  });

  it('возврат курсора, пока панель уходит, открывает сразу', () => {
    let isLeaving = false;
    const opened: OpenedBy[] = [];
    const popup = createHoverPopup({
      openDelay: 250,
      closeDelay: 500,
      onOpen: (openedBy) => {
        opened.push(openedBy);
      },
      onClose: () => {
        isLeaving = true;
      },
      isHeld: NOT_HELD,
      isLeaving: () => {
        return isLeaving;
      },
    });

    popup.enter(A);
    vi.advanceTimersByTime(250);
    popup.leave();
    vi.advanceTimersByTime(500);
    expect(popup.isOpen).toBe(false);
    popup.enter(A);
    expect(popup.isOpen).toBe(true);
    expect(opened).toEqual(['hover', 'hover']);

    popup.dismiss();
    isLeaving = false;
    popup.enter(A);
    expect(popup.isOpen).toBe(false);
  });

  it('берёт таймеры у переданного планировщика', () => {
    const calls: number[] = [];
    let fire = () => {};

    const popup = createHoverPopup({
      openDelay: 250,
      closeDelay: 500,
      onOpen: () => {},
      onClose: () => {},
      isHeld: () => {
        return false;
      },
      schedule: (callback, ms) => {
        calls.push(ms);
        fire = callback;

        return () => {};
      },
    });

    popup.enter(A);
    expect(calls).toEqual([250]);
    fire();
    expect(popup.isOpen).toBe(true);
  });
});

describe('createPopupHolds', () => {
  it('без причин попап не удержан', () => {
    const holds = createPopupHolds();

    expect(holds.isHeld()).toBe(false);
  });

  it('удерживает, пока жива хоть одна причина', () => {
    const holds = createPopupHolds();

    holds.set('field', true);
    holds.set('fileDialog', true);
    expect(holds.isHeld()).toBe(true);
    holds.set('field', false);
    expect(holds.isHeld()).toBe(true);
    holds.set('fileDialog', false);
    expect(holds.isHeld()).toBe(false);
  });

  it('повторная запись той же причины не копится', () => {
    const holds = createPopupHolds();

    holds.set('import', true);
    holds.set('import', true);
    holds.set('import', false);
    expect(holds.isHeld()).toBe(false);
  });

  it('releasePanel снимает фокус, диалог файла и предпросмотр, но не импорт и конвертацию', () => {
    const holds = createPopupHolds();

    holds.set('field', true);
    holds.set('fileDialog', true);
    holds.set('preview', true);
    holds.releasePanel();
    expect(holds.isHeld()).toBe(false);

    holds.set('import', true);
    holds.releasePanel();
    expect(holds.isHeld()).toBe(true);
    holds.set('import', false);

    holds.set('conversion', true);
    holds.releasePanel();
    expect(holds.isHeld()).toBe(true);
  });

  it('открытый экран удерживает попап и переживает закрытие панели', () => {
    let released = 0;
    const holds = createPopupHolds(() => {
      released += 1;
    });

    holds.set('screen', true);
    expect(holds.isHeld()).toBe(true);

    holds.releasePanel();
    expect(holds.isHeld()).toBe(true);
    expect(released).toBe(0);

    holds.set('screen', false);
    expect(holds.isHeld()).toBe(false);
    expect(released).toBe(1);
  });

  it('экран и фокус в поле: уход фокуса не отпускает попап, закрытие экрана — отпускает', () => {
    const holds = createPopupHolds();

    holds.set('screen', true);
    holds.set('field', true);
    holds.set('field', false);
    expect(holds.isHeld()).toBe(true);
    holds.set('screen', false);
    expect(holds.isHeld()).toBe(false);
  });

  it('закрытая панель снимает причину preview и сообщает о снятии', () => {
    let released = 0;
    const holds = createPopupHolds(() => {
      released += 1;
    });

    holds.set('preview', true);
    expect(holds.isHeld()).toBe(true);
    holds.releasePanel();
    expect(holds.isHeld()).toBe(false);
    expect(released).toBe(1);
  });

  it('onRelease зовётся, когда снята последняя причина, и только тогда', () => {
    let released = 0;
    const holds = createPopupHolds(() => {
      released += 1;
    });

    holds.set('field', false);
    expect(released).toBe(0);

    holds.set('field', true);
    holds.set('conversion', true);
    holds.set('field', false);
    expect(released).toBe(0);
    holds.set('conversion', false);
    expect(released).toBe(1);

    holds.set('fileDialog', true);
    holds.releasePanel();
    expect(released).toBe(2);
    holds.releasePanel();
    expect(released).toBe(2);
  });

  it('удержание не даёт уходу курсора закрыть попап, а dismiss закрывает', () => {
    vi.useFakeTimers();
    const holds = createPopupHolds();
    const { popup, closedCount } = setup(holds.isHeld);

    popup.enter(A);
    vi.advanceTimersByTime(250);
    holds.set('field', true);
    popup.leave();
    vi.advanceTimersByTime(500);
    expect(popup.isOpen).toBe(true);
    popup.dismiss();
    expect(closedCount()).toBe(1);
    vi.useRealTimers();
  });
});

describe('createPanelPhase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Фаза панели с длительностью ухода 200 мс и журналом смен.
   *
   * @returns фаза и журнал фаз, о которых сообщил `onChange`
   */
  const setupPhase = () => {
    const changes: PanelPhase[] = [];
    const panel = createPanelPhase({
      closeDuration: 200,
      onChange: (phase) => {
        changes.push(phase);
      },
    });

    return { panel, changes };
  };

  it('начинает закрытой', () => {
    const { panel } = setupPhase();

    expect(panel.phase).toBe('closed');
  });

  it('уходит через closing и прячется через 200 мс', () => {
    const { panel, changes } = setupPhase();

    panel.show();
    panel.hide();
    expect(panel.phase).toBe('closing');
    vi.advanceTimersByTime(199);
    expect(panel.phase).toBe('closing');
    vi.advanceTimersByTime(1);
    expect(panel.phase).toBe('closed');
    expect(changes).toEqual(['open', 'closing', 'closed']);
  });

  it('повторное открытие во время ухода отменяет скрытие', () => {
    const { panel, changes } = setupPhase();

    panel.show();
    panel.hide();
    vi.advanceTimersByTime(100);
    panel.show();
    expect(panel.phase).toBe('open');
    vi.advanceTimersByTime(500);
    expect(panel.phase).toBe('open');
    expect(changes).toEqual(['open', 'closing', 'open']);
  });

  it('show у открытой и hide у закрытой ничего не делают', () => {
    const { panel, changes } = setupPhase();

    panel.hide();
    panel.show();
    panel.show();
    panel.hide();
    panel.hide();
    expect(changes).toEqual(['open', 'closing']);
  });
});
