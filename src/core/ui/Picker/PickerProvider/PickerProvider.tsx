import type { FunctionComponent as FC } from 'preact';

import { PickerViewContext } from '../usePickerView/PickerViewContext';

import { FavoritesContext } from './useFavorites/FavoritesContext';
import { PickerContext } from './PickerContext';
import type { PickerProviderProps } from './PickerProvider.types';
import { usePickerState } from './usePickerState';

export const PickerProvider: FC<PickerProviderProps> = (props) => {
  const { env, onSend, onClose, isOpen, openedBy, holds, children } = props;
  const { picker, view, favorites } = usePickerState({
    env,
    onSend,
    onClose,
    isOpen,
    openedBy,
    holds,
  });

  return (
    <PickerContext.Provider value={picker}>
      <PickerViewContext.Provider value={view}>
        <FavoritesContext.Provider value={favorites}>
          {children}
        </FavoritesContext.Provider>
      </PickerViewContext.Provider>
    </PickerContext.Provider>
  );
};
