import type { ComponentChildren } from 'preact';

export type EmptyStateProps = {
  /**
   * Текст пустого состояния, при необходимости — с действием.
   */
  children: ComponentChildren;

  /**
   * Роль для скринридера: `alert` — ошибка, которую нужно объявить при появлении; без роли —
   * пустое состояние, которое читается при обходе ленты.
   */
  role?: 'alert';
};
