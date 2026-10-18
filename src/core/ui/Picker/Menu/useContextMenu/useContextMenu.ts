import { useCallback, useRef, useState } from 'preact/hooks';

import { contextAnchor } from '@ui/Menu/contextAnchor';
import type { MenuPoint } from '@ui/Menu/menuPosition';

import type { ContextMenu, ContextMenuOpening } from './useContextMenu.types';

/**
 * Состояние контекстного меню ячейки. Меню открывает событие `contextmenu` — правый клик — и
 * нажатие клавиши меню или `Shift+F10` на ячейке.
 *
 * @returns открытое меню, его открытие и закрытие
 */
export const useContextMenu = (): ContextMenu => {
  const [opening, setOpening] = useState<ContextMenuOpening | null>(null);
  const seqRef = useRef(0);

  const open = useCallback((point: MenuPoint | null, source: HTMLElement) => {
    const { left, top, right, bottom } = source.getBoundingClientRect();
    const rect = { left, top, right, bottom };

    seqRef.current += 1;
    setOpening({
      anchor: point ? contextAnchor(point, rect) : rect,
      source,
      seq: seqRef.current,
    });
  }, []);

  const close = useCallback(() => {
    setOpening(null);
  }, []);

  return { opening, open, close };
};
