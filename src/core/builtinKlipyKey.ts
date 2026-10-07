/**
 * Встроенный ключ KLIPY из сборки (`KLIPY_API_KEY` при `pnpm build`). Пустая строка —
 * сборка без него: локальная, `pnpm watch`, PR из форка.
 *
 * Константу сборки читает только этот модуль: остальной код импортирует его, и тесты
 * подменяют ключ `vi.mock` модуля.
 */
export const BUILTIN_KLIPY_KEY: string = __KLIPY_API_KEY__;
