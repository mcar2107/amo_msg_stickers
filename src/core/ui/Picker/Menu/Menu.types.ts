import type { ComponentChildren } from 'preact';

import type { Box } from './menuPosition';

export type MenuProps = {
  /**
   * Название меню для скринридера.
   */
  label: string;

  /**
   * Источник меню в координатах окна: точка клика или прямоугольник кнопки. Читается при
   * монтировании.
   */
  anchor: Box;

  /**
   * Элемент, на который возвращается фокус при закрытии меню.
   */
  source: HTMLElement;

  /**
   * Колбэк на закрытие меню: владелец убирает его из дерева.
   */
  onClose: () => void;

  /**
   * Пункты меню — `MenuItem`.
   */
  children: ComponentChildren;
};

/**
 * Открытое меню у владельца: где открыто и куда вернуть фокус.
 */
export type MenuOpening = {
  /**
   * Источник меню в координатах окна.
   */
  anchor: Box;

  /**
   * Элемент, на который возвращается фокус.
   */
  source: HTMLElement;
};
