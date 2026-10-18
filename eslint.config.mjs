import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintPluginJsdoc from 'eslint-plugin-jsdoc';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import ts from 'typescript';
import tseslint from 'typescript-eslint';

/**
 * Имена alias — из `paths` в `tsconfig.json`, единственного их источника: новый alias сразу
 * попадает в группу сортировки и в границы ниже. Конфиг читает TypeScript, а не `JSON.parse`:
 * в `tsconfig.json` допустимы комментарии.
 */
const ALIASES = [
  ...new Set(
    Object.keys(
      ts.readConfigFile(`${import.meta.dirname}/tsconfig.json`, ts.sys.readFile).config
        .compilerOptions.paths
    ).map((key) => {
      return key.replace(/\/\*$/, '');
    })
  ),
];

/**
 * Регулярное выражение спецификатора, который начинается с одного из alias: сам alias или
 * путь за ним, но не `@coreX`.
 */
const aliasRegex = (aliases) => {
  return `^(${aliases.join('|')})(/|$)`;
};

/**
 * Alias, кроме перечисленных: границы `shared` и агента разрешают только свои области.
 */
const aliasesExcept = (...allowed) => {
  return ALIASES.filter((alias) => {
    return !allowed.includes(alias);
  });
};

/**
 * Спецификатор вверх по дереву: `..`, `../x` и `./../x`.
 */
const PARENT_IMPORT_REGEX = String.raw`^(\./)*\.\.(/|$)`;

/**
 * Граница ядра: ядро знает только контракты `core/host.types.ts` и протокол агента
 * `shared/pageBridge.ts`, а окружения подключают к ним свои адаптеры и агента, а не наоборот.
 */
const CORE_BOUNDARY = {
  regex: aliasRegex(['@userscript', '@extension']),
  message:
    'Граница ядра: src/core не импортирует из src/userscript и src/extension — только контракты core/host.types.ts.',
};

/**
 * Правило импортов `src/`: запреты всего `src/` и запреты области. Конфиг области заменяет
 * правило целиком, а не дополняет, поэтому общие запреты входят в каждый.
 *
 * @param patterns — запреты области
 * @param parentRegex — запрет пути вверх по дереву; свой — у файла с исключением
 */
const srcImportRule = (patterns = [], parentRegex = PARENT_IMPORT_REGEX) => {
  return [
    'error',
    {
      patterns: [
        {
          regex: parentRegex,
          message:
            'Импорт вне своего каталога — через alias (@core, @ui, @shared, …): относительный путь только вниз по дереву.',
        },
        {
          regex: String.raw`^@core/ui/Picker(/|$)`,
          message: 'UI пикера импортируется через @ui, а не @core/ui/Picker.',
        },
        ...patterns,
      ],
    },
  ];
};

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
      /**
       * Импорты одного вида из одного спецификатора сливаются в один; пара `import type` и импорта
       * значений остаётся раздельной — так тип виден в строке импорта.
       */
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            ['^@?\\w'],
            [aliasRegex(ALIASES)],
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
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': srcImportRule(),
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': srcImportRule([CORE_BOUNDARY]),
    },
  },
  {
    /**
     * `tailwind.config` в корне репозитория — не область alias, и стиль ленты берёт его токены
     * относительным путём: ради одного файла вне `src/` своего alias нет. Исключение — только
     * этому файлу и только этому пути.
     */
    files: ['src/core/amoDomStyle.ts'],
    rules: {
      'no-restricted-imports': srcImportRule(
        [CORE_BOUNDARY],
        String.raw`^(?!\.\./\.\./tailwind\.config$)(\./)*\.\.(/|$)`
      ),
    },
  },
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      // Общие модули импортируют и ядро, и окружения, и агент в мире страницы: сами они не
      // зависят ни от кого, иначе через них в агента утянется ядро.
      'no-restricted-imports': srcImportRule([
        {
          regex: aliasRegex(aliasesExcept('@shared')),
          message: 'Граница shared: src/shared не импортирует ничего вне src/shared.',
        },
      ]),
    },
  },
  {
    files: ['src/page/**/*.ts'],
    rules: {
      // Агент уходит в мир страницы строкой в userscript и файлом в расширении: в нём только
      // его модули и протокол, без ядра и окружений.
      'no-restricted-imports': srcImportRule([
        {
          regex: aliasRegex(aliasesExcept('@page', '@shared')),
          message: 'Граница агента: src/page импортирует только src/page и src/shared.',
        },
      ]),
    },
  }
);
