import { NO_TIMER, scheduleTimeout } from '@core/hoverPopup';

import type { ScrollLock, ScrollLockOptions } from './scrollLock.types';

/**
 * Удержание выбранной вкладки без DOM: пока лента плавно едет к разделу по клику на вкладку,
 * выбранной считается нажатая, а не вкладки промежуточных паков под верхом ленты.
 *
 * Конец прокрутки определяется тишиной — `quietMs` без событий прокрутки, — а не `scrollend`:
 * таймер тишины одинаково работает во всех браузерах, где запускается userscript. Таймеры —
 * через `schedule`, поэтому контроллер проверяется на фейковых таймерах.
 *
 * @param options — тишина, планировщик и колбэк смены удержания
 * @returns управление удержанием
 */
export const createScrollLock = (options: ScrollLockOptions): ScrollLock => {
  const { quietMs, schedule = scheduleTimeout, onChange } = options;
  let sectionId: string | null = null;
  let cancelQuiet = NO_TIMER;
  let isDisposed = false;

  const release = () => {
    cancelQuiet();
    cancelQuiet = NO_TIMER;

    if (sectionId === null) return;

    sectionId = null;
    onChange(null);
  };

  const restartQuiet = () => {
    cancelQuiet();
    cancelQuiet = schedule(release, quietMs);
  };

  return {
    lock: (nextId) => {
      if (isDisposed) return;

      restartQuiet();

      if (nextId === sectionId) return;

      sectionId = nextId;
      onChange(nextId);
    },
    scroll: () => {
      if (isDisposed || sectionId === null) return;

      restartQuiet();
    },
    interrupt: () => {
      if (isDisposed) return;

      release();
    },
    current: () => {
      return sectionId;
    },
    dispose: () => {
      isDisposed = true;
      cancelQuiet();
      cancelQuiet = NO_TIMER;
    },
  };
};
