import type { VariantProps } from 'class-variance-authority';
import type { ComponentChildren, JSX } from 'preact';

import type { buttonVariants } from './Button';

/**
 * Вид обязателен: у кнопки нет вида по умолчанию, поэтому `null` и `undefined` из
 * `VariantProps` отрезаны.
 */
export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;

/**
 * Событие клика по кнопке.
 */
export type ButtonClickEvent = JSX.TargetedMouseEvent<HTMLButtonElement>;

type ButtonBaseProps = {
  /**
   * Вид кнопки: основная — акцентная заливка, второстепенная — нейтральная заливка того же
   * размера, опасная — мелкая текстовая кнопка цвета ошибки.
   */
  variant: ButtonVariant;

  /**
   * Кнопка недоступна: полупрозрачна и не нажимается, а кнопка отправки ещё и не даёт
   * отправить свою форму Enter-ом из поля.
   */
  isDisabled?: boolean;

  /**
   * Подпись кнопки.
   */
  children: ComponentChildren;
};

/**
 * Обычная кнопка: действие — только колбэк, поэтому он обязателен.
 */
export type ButtonActionProps = ButtonBaseProps & {
  /**
   * Тип кнопки; без него — `button`, кнопка не отправляет формы.
   */
  type?: 'button';

  /**
   * Связь с формой бывает только у кнопки отправки.
   */
  form?: never;

  /**
   * Колбэк на нажатие; событие нужно, чтобы отличить клик мышью от нажатия с клавиатуры и
   * повторный клик серии (`detail`).
   */
  onClick: (event: ButtonClickEvent) => void;
};

/**
 * Кнопка отправки формы: действие — обработчик `submit` формы, поэтому колбэк
 * необязателен.
 */
export type ButtonSubmitProps = ButtonBaseProps & {
  /**
   * Тип кнопки — отправка формы.
   */
  type: 'submit';

  /**
   * Id формы, которую кнопка отправляет, если кнопка лежит вне неё (футер экрана). Форма
   * ищется в том же дереве, что и кнопка, — в shadow root пикера.
   */
  form?: string;

  /**
   * Колбэк на нажатие, до отправки формы.
   */
  onClick?: (event: ButtonClickEvent) => void;
};

export type ButtonProps = ButtonActionProps | ButtonSubmitProps;
