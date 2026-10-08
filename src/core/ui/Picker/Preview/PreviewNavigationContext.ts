import { createContext } from 'preact';

import type { PreviewNavigator } from './PreviewProvider.types';

/**
 * Навигатор ленты, в которой лежит ячейка: лента кладёт его над своими ячейками, и закреплённый
 * предпросмотр ячейки переключается стрелками по этой ленте. `null` — ячейка вне ленты (превью
 * черновика своего стикера), и стрелки предпросмотр не переключают.
 */
export const PreviewNavigationContext = createContext<PreviewNavigator | null>(null);
