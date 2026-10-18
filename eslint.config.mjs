import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintPluginJsdoc from 'eslint-plugin-jsdoc';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'local/**',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
    ],
  },
  {
    files: ['**/*.{js,cjs,mjs,cts,mts,jsx,ts,tsx}'],
    plugins: {
      jsdoc: eslintPluginJsdoc,
      'simple-import-sort': eslintPluginSimpleImportSort,
      unicorn: eslintPluginUnicorn,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  tseslint.configs.recommended,
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.{ts,tsx,d.ts,mts}'],
    rules: {
      'no-unused-vars': 'off',
      // Глобалы описаны типами; необъявленное имя ловит tsc. Правило даёт
      // только ложные срабатывания.
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            ArrowFunctionExpression: false,
            ClassDeclaration: false,
            FunctionDeclaration: false,
            FunctionExpression: false,
            MethodDefinition: false,
          },
          contexts: ['TSPropertySignature'],
        },
      ],
      'jsdoc/require-description': [
        /**
         * Постепенно смигрировать и включить error
         */
        'warn',
        {
          contexts: ['TSPropertySignature'],
        },
      ],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    /**
     * Правила React (UI на Preact) живут только на `.tsx`: в `.ts` компонентов
     * и хуков нет, а `jsx-a11y` без JSX просто нечего проверять.
     */
    files: ['**/*.tsx'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'jsx-a11y': eslintPluginJsxA11y,
    },
    rules: {
      ...eslintPluginReactHooks.configs['recommended-latest'].rules,
      ...eslintPluginJsxA11y.flatConfigs.recommended.rules,
      /**
       * Набор recommended плюс `region`: прокручиваемая область без фокусируемых потомков должна получать фокус с
       * клавиатуры, иначе до скрытых строк не добраться, а сама в порядок Tab браузер ставит её только с Chrome 130.
       */
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { tags: [], roles: ['tabpanel', 'region'], allowExpressionValues: true },
      ],
    },
  },
  {
    files: ['**/*.{js,cjs,mjs,cts,mts,jsx,ts,tsx}'],
    rules: {
      'jsdoc/multiline-blocks': [
        'error',
        {
          noSingleLineBlocks: true,
          singleLineTags: [],
        },
      ],
      'arrow-body-style': ['error', 'always'],
      'arrow-parens': ['error', 'always'],
      // Код исполняется внутри чужой страницы amo: консоль — единственный канал
      // диагностики, поэтому warn/info разрешены наравне с error.
      'no-console': ['error', { allow: ['error', 'warn', 'info'] }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            ['^@?\\w'],
            ['^@/'],
            ['^.+\\.s?css$'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
          ],
        },
      ],
      'operator-linebreak': [
        2,
        'after',
        {
          overrides: {
            '?': 'before',
            ':': 'before',
          },
        },
      ],
      'padded-blocks': [2, 'never'],
      'no-fallthrough': [2, { allowEmptyCase: true }],
      'unicorn/switch-case-braces': ['error', 'always'],
      'padding-line-between-statements': [
        2,
        {
          blankLine: 'always',
          prev: '*',
          next: 'return',
        },
        {
          blankLine: 'always',
          prev: ['const', 'let', 'var'],
          next: '*',
        },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
        {
          blankLine: 'always',
          prev: 'directive',
          next: '*',
        },
        {
          blankLine: 'any',
          prev: 'directive',
          next: 'directive',
        },
        {
          blankLine: 'always',
          prev: 'block-like',
          next: '*',
        },
        {
          blankLine: 'always',
          prev: 'multiline-block-like',
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: 'multiline-block-like',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['case', 'default'],
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      // Ядро знает только контракты `core/host.types.ts` и протокол агента `shared/pageBridge.ts`:
      // окружения подключают к ним свои адаптеры и агента, а не наоборот.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: String.raw`^(\.\./)+(userscript|extension)(/|$)`,
              message:
                'Граница ядра: src/core не импортирует из src/userscript и src/extension — только контракты core/host.types.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      // Общие модули импортируют и ядро, и окружения, и агент в мире страницы: сами они не
      // зависят ни от кого, иначе через них в агента утянется ядро.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: String.raw`^\.\./`,
              message: 'Граница shared: src/shared не импортирует ничего вне src/shared.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/page/**/*.ts'],
    rules: {
      // Агент уходит в мир страницы строкой в userscript и файлом в расширении: в нём только
      // его модули и протокол, без ядра и окружений.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: String.raw`^\.\./(?!shared/)`,
              message:
                'Граница агента: src/page импортирует только src/page и src/shared.',
            },
          ],
        },
      ],
    },
  }
);
