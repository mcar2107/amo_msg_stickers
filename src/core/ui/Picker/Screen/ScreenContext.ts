import { createContext } from 'preact';

import type { ScreenLeave } from './ScreenContext.types';

/**
 * Уход экрана — для кнопок его футера и тела, которые закрывают экран, как «Назад». `null` —
 * компонент вне `Screen`.
 */
export const ScreenContext = createContext<ScreenLeave | null>(null);
