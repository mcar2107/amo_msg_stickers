import type { ComponentChildren } from 'preact';

export type ScreenProps = {
  /**
   * Заголовок экрана — и имя его области в дереве доступности.
   */
  title: string;

  /**
   * Содержимое футера экрана: главная кнопка и то, что стоит рядом с ней. Уход экрана
   * кнопкам футера даёт `useScreenLeave`.
   */
  footer: ComponentChildren;

  /**
   * Прокручиваемое тело экрана.
   */
  children: ComponentChildren;
};
