import type { RefObject } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

import type { Box, MenuPoint } from '@ui/Menu/menuPosition';
import { menuPosition } from '@ui/Menu/menuPosition';

import type { MenuState } from './useMenu.types';

const MENU_ITEM_SELECTOR = '[role="menuitem"]';

/**
 * Окно — граница меню, если оно открыто не внутри панели.
 *
 * @returns прямоугольник окна
 */
const viewportBox = (): Box => {
  return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
};

/**
 * Место, фокус и закрытие меню.
 *
 * Меню стоит `position: fixed` и не обрезается прокручиваемой лентой, внутри которой
 * открыто. Блок позиционирования у него — предок с `transform` на странице amo, а не окно,
 * поэтому сдвиг меряется: меню рисуется скрытым в нуле блока, и разница между нужным местом и
 * фактическим углом становится его `left` / `top`. Место считается один раз при монтировании:
 * меню на новом месте — новое меню.
 *
 * Меню закрывается нажатием мыши вне него и вне источника, прокруткой под ним и уходом фокуса
 * наружу. Нажатие на источник меню не закрывает: повторный клик по кнопке «…» закрывает его сам,
 * а не открывает заново.
 *
 * @param menuRef — элемент меню
 * @param anchor — источник меню: точка клика или прямоугольник кнопки, в координатах окна
 * @param source — элемент, на который возвращается фокус
 * @param onClose — колбэк на закрытие меню
 * @returns сдвиг меню и его закрытие
 */
export const useMenu = (
  menuRef: RefObject<HTMLDivElement>,
  anchor: Box,
  source: HTMLElement,
  onClose: () => void
): MenuState => {
  const [offset, setOffset] = useState<MenuPoint | null>(null);
  const anchorRef = useRef(anchor);
  const isPlaced = offset !== null;

  const close = useCallback(() => {
    source.focus({ preventScroll: true });
    onClose();
  }, [source, onClose]);

  useLayoutEffect(() => {
    const menu = menuRef.current;

    if (!menu) return;

    const origin = menu.getBoundingClientRect();
    const bounds = menu.closest('dialog')?.getBoundingClientRect() || viewportBox();
    const { left, top } = menuPosition(anchorRef.current, origin, bounds);

    setOffset({ left: left - origin.left, top: top - origin.top });
  }, [menuRef]);

  /**
   * Фокус — после измерения: скрытое `visibility: hidden` меню фокус не принимает.
   */
  useEffect(() => {
    const menu = menuRef.current;

    if (!menu || !isPlaced) return;

    const first = menu.querySelector<HTMLElement>(MENU_ITEM_SELECTOR) || menu;

    first.focus({ preventScroll: true });
  }, [isPlaced, menuRef]);

  useEffect(() => {
    const menu = menuRef.current;

    if (!menu) return;

    const root = menu.getRootNode();
    const host = root instanceof ShadowRoot ? root.host : null;

    const isOwn = (event: Event) => {
      const path = event.composedPath();

      return path.includes(menu) || path.includes(source);
    };

    const handleRootMouseDown = (event: Event) => {
      if (!isOwn(event)) close();
    };

    const handleRootScroll = () => {
      close();
    };

    /**
     * Для слушателя документа путь нажатия внутри закрытого shadow root обрывается на его
     * хосте: нажатие вне хоста — вне пикера, внутреннее разбирает слушатель корня.
     */
    const handleDocumentMouseDown = (event: Event) => {
      if (host && !event.composedPath().includes(host)) close();
    };

    root.addEventListener('mousedown', handleRootMouseDown, true);
    root.addEventListener('scroll', handleRootScroll, true);
    if (host) document.addEventListener('mousedown', handleDocumentMouseDown, true);

    return () => {
      root.removeEventListener('mousedown', handleRootMouseDown, true);
      root.removeEventListener('scroll', handleRootScroll, true);
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    };
  }, [close, menuRef, source]);

  return { offset, close };
};
