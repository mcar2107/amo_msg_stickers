import { useContext } from 'preact/hooks';

import { ScreenContext } from '../ScreenContext';

/**
 * Уход экрана, в котором лежит компонент: та же анимация и закрытие по её концу, что у
 * «Назад».
 *
 * @returns уход экрана
 */
export const useScreenLeave = (): (() => void) => {
  const leave = useContext(ScreenContext);

  if (!leave) throw new Error('useScreenLeave: компонент вне Screen');

  return leave;
};
