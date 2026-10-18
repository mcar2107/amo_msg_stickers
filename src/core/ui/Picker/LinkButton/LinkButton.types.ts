import type { ComponentChildren } from 'preact';

export type LinkButtonProps = {
  /**
   * Колбэк на нажатие: переход внутри пикера — открытие экрана.
   */
  onClick: () => void;

  /**
   * Подпись.
   */
  children: ComponentChildren;
};
