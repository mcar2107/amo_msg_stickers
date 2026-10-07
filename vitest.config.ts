import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        /**
         * Сборка подставляет токен встроенного бота и ключ KLIPY; тестам — сборка без них.
         * Модули, которые читают константы, тесты подменяют `vi.mock`, а импорт без подмены не
         * падает на `ReferenceError`.
         */
        define: { __TELEGRAM_BOT_TOKEN__: '""', __KLIPY_API_KEY__: '""' },
        test: {
          name: 'unit',
          include: ['tests/**/*.test.{ts,tsx}'],
          environment: 'node',
        },
      },
    ],
  },
});
