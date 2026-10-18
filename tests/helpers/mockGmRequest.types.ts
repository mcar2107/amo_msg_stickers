import type { GmRequestDetails } from '@userscript/gm.types';

/**
 * Поведение мок-менеджера: какие колбэки запроса и в каком порядке он зовёт. Вызывается
 * синхронно внутри запроса, до возврата handle, — как самый неудобный для адаптера порядок.
 */
export type GmScript = (details: GmRequestDetails) => void;
