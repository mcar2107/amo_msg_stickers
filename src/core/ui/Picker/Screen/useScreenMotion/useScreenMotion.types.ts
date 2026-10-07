import type { RefObject } from 'preact';

export type ScreenMotion = {
  /**
   * Ref корня экрана: на нём играют появление и уход.
   */
  screenRef: RefObject<HTMLElement>;

  /**
   * Уход экрана с закрытием по его концу. Повторный вызов во время ухода ничего не делает.
   */
  leave: () => void;
};
