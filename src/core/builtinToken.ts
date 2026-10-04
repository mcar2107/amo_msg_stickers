/**
 * Токен встроенного Telegram-бота из сборки (`TELEGRAM_BOT_TOKEN` при `pnpm build`).
 * Пустая строка — сборка без него: локальная, `pnpm watch`, PR из форка.
 *
 * Константу сборки читает только этот модуль: остальной код импортирует его, и тесты
 * подменяют токен `vi.mock` модуля.
 */
export const BUILTIN_TELEGRAM_TOKEN: string = __TELEGRAM_BOT_TOKEN__;
