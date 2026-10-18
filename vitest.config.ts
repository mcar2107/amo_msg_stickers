import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Код отдельных бандлов строкой (`gif-worker:code`, `page-agent:code`) собирают плагины esbuild в
 * `build.mjs`, а vitest их не знает. Barrel модуля тянет все его файлы, и тест модуля, рядом с
 * которым лежит импорт конвертации, без заглушки падал бы на импорте. Строка в тестах пустая:
 * Worker и агент из неё тесты не запускают, а где строка нужна, тест подменяет модуль `vi.mock`.
 */
const VIRTUAL_CODE_MODULES: Record<string, string> = {
  'gif-worker:code': 'GIF_WORKER_CODE',
  'page-agent:code': 'PAGE_AGENT_CODE',
};

const VIRTUAL_PREFIX = '\0virtual-code:';

const virtualCodeStubs: Plugin = {
  name: 'virtual-code-stubs',
  resolveId(id) {
    return id in VIRTUAL_CODE_MODULES ? `${VIRTUAL_PREFIX}${id}` : null;
  },
  load(id) {
    if (!id.startsWith(VIRTUAL_PREFIX)) {
      return null;
    }

    return `export const ${VIRTUAL_CODE_MODULES[id.slice(VIRTUAL_PREFIX.length)]} = '';`;
  },
};

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
        /**
         * Alias берутся из `paths` в `tsconfig.json`, а не копией списка: новый alias не разъедется
         * между проверкой типов, сборкой и тестами. По ним же разрешается путь `vi.mock`.
         */
        resolve: { tsconfigPaths: true },
        plugins: [virtualCodeStubs],
        test: {
          name: 'unit',
          include: ['tests/**/*.test.{ts,tsx}'],
          environment: 'node',
        },
      },
    ],
  },
});
