import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC, TargetedFocusEvent } from 'preact';
import { useRef } from 'preact/hooks';

import type { MenuProps } from './Menu.types';
import { MenuContext } from './MenuContext';
import { nextMenuIndex } from './menuFocus';
import { useMenu } from './useMenu';

/**
 * Tab тоже закрывает меню: пункты вне порядка Tab, и без закрытия фокус ушёл бы из открытого
 * меню к следующему элементу панели.
 */
const CLOSE_KEYS = new Set(['Escape', 'Tab']);

/**
 * `z-30` — над абсолютно поставленными рядами ленты, которые идут в DOM после меню, и над строкой статуса (`z-20`):
 * меню у низа ленты иначе ушло бы пунктами под показанный статус. Экран (`z-10`) меню не перекрывает: экран
 * открывается нажатием вне меню, и меню к этому времени закрыто.
 *
 * Появление — переход прозрачности при переходе в `isPlaced`: до замера меню невидимо и не
 * мигает в левом верхнем углу, поэтому `@starting-style` не нужен. Закрытие размонтирует меню,
 * и оно уходит сразу. Переход и длительность — под `motion-safe:`: длительность по умолчанию
 * из `motion-safe:transition-opacity` перебила бы простую `duration-base`.
 */
const menuVariants = cva(
  [
    'fixed z-30 flex min-w-[160px] flex-col rounded-lg p-1 outline-none',
    'bg-white-0 shadow-xxl ring-1 ring-cadetGray-30/[.28] dark:bg-gray-10 dark:ring-white-0/10',
  ],
  {
    variants: {
      isPlaced: {
        true: 'opacity-100 motion-safe:transition-opacity motion-safe:duration-base',
        false: 'invisible opacity-0',
      },
    },
  }
);

/**
 * Меню в пределах панели: контекстное меню ячейки и меню «…» раздела. Фокус — на первом пункте,
 * стрелки, `Home` и `End` ходят по пунктам, Escape и Tab закрывают меню и возвращают фокус на
 * источник.
 *
 * Нажатия не всплывают из меню: Escape панели закрыл бы весь попап, а меню должно закрыться
 * одно.
 */
export const Menu: FC<MenuProps> = (props) => {
  const { label, anchor, source, onClose, children } = props;
  const menuRef = useRef<HTMLDivElement>(null);
  const { offset, close } = useMenu(menuRef, anchor, source, onClose);

  const handleMenuKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();

    if (CLOSE_KEYS.has(event.key)) {
      event.preventDefault();
      close();

      return;
    }

    const items = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []),
    ];
    const current = items.findIndex((item) => {
      return item === event.target;
    });
    const next = nextMenuIndex(event.key, current, items.length);

    if (next === null) return;

    event.preventDefault();
    items[next]?.focus();
  };

  /**
   * Фокус ушёл наружу — меню закрывается без возврата фокуса: он уже там, куда его перевели.
   * Уход фокуса на источник меню не закрывает: нажатие на кнопку «…» переводит на неё фокус до
   * клика, и клик закрыл бы уже закрытое меню — то есть открыл бы его снова.
   */
  const handleMenuFocusOut = (event: TargetedFocusEvent<HTMLDivElement>) => {
    const { relatedTarget, currentTarget } = event;

    if (relatedTarget === source) return;
    if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;

    onClose();
  };

  /**
   * Меню браузера поверх своего не нужно. Клавиша меню на Windows шлёт `contextmenu` уже после
   * того, как своё меню открылось по нажатию и фокус встал на пункт.
   */
  const handleMenuContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  return (
    <MenuContext.Provider value={close}>
      <div
        ref={menuRef}
        role="menu"
        aria-label={label}
        tabIndex={-1}
        className={menuVariants({ isPlaced: offset !== null })}
        style={{ left: offset?.left || 0, top: offset?.top || 0 }}
        onKeyDown={handleMenuKeyDown}
        onFocusOut={handleMenuFocusOut}
        onContextMenu={handleMenuContextMenu}
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
};
