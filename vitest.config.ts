import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        /**
         * Сборка подставляет токен встроенного бота; тестам — сборка без него. Модуль, который
         * читает константу, тесты подменяют `vi.mock`, а импорт без подмены не падает на
         * `ReferenceError`.
         */
        define: { __TELEGRAM_BOT_TOKEN__: '""' },
        test: {
          name: 'unit',
          include: ['tests/**/*.test.{ts,tsx}'],
          environment: 'node',
        },
      },
    ],
  },
});
