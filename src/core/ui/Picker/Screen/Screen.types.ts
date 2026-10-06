import type { ComponentChildren } from 'preact';

export type ScreenProps = {
  /**
   * Заголовок экрана — и имя его области в дереве доступности.
   */
  title: string;

  /**
   * Содержимое футера экрана: главная кнопка и то, что стоит рядом с ней. Без него строки
   * футера нет, и тело тянется до низа панели.
   */
  footer?: ComponentChildren;

  /**
   * Прокручиваемое тело экрана.
   */
  children: ComponentChildren;
};
