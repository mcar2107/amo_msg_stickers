import type { ComponentChildren } from 'preact';

export type DropZoneProps = {
  /**
   * Имя выбранного файла — показывается в зоне, кнопка тогда «Заменить файл»; `null` — файл
   * не выбран.
   */
  fileName: string | null;

  /**
   * Превью выбранного файла: встаёт в зону вместо иконки и текста, пока файл выбран.
   */
  preview: ComponentChildren;

  /**
   * Колбэк на выбор файла в диалоге или перетаскиванием; `undefined` — файла в выборе нет.
   */
  onPick: (file: File | undefined) => void;
};
