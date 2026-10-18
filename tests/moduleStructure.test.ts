import { describe, expect, it } from 'vitest';

import tsconfig from '../tsconfig.json';

/**
 * Тексты файлов кода по путям от теста: импорты читаются из исходника, модули не исполняются.
 */
const SOURCES = import.meta.glob(
  ['../src/**/*.{ts,tsx}', '../tests/**/*.{ts,tsx}', '../scripts/*.ts'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  }
);

/**
 * Плоские области: файлы лежат рядом, barrel-а у каталога нет, и alias ведёт прямо в файл.
 * Любой другой каталог с кодом — модуль со своим `index.ts`.
 */
const FLAT_AREAS = new Set([
  'src',
  'src/core',
  'src/core/ui',
  'src/shared',
  'src/page',
  'src/extension',
  'src/userscript',
  'scripts',
  'tests',
]);

/**
 * Расширения, которые разрешение модуля подставляет к пути без расширения.
 */
const CODE_EXTENSIONS = ['.ts', '.tsx', '.d.ts'];

/**
 * Спецификатор модуля в импорте, реэкспорте, динамическом импорте и подмене `vi.mock` —
 * подмена barrel-а или файла внутри модуля ломается так же, как импорт.
 */
const SPECIFIER_REGEX =
  /\b(?:from|import)\s*\(?\s*'([^'\n]+)'|\bvi\.(?:mock|doMock|unmock|importActual)(?:<[^>]*>)?\(\s*'([^'\n]+)'/g;

/**
 * Пути файлов от корня репозитория: ключи `import.meta.glob` — пути от теста, файлы его же
 * каталога начинаются с `./`.
 */
const FILES = new Map(
  Object.entries(SOURCES).map(([path, text]) => {
    return [path.replace(/^\.\//, 'tests/').replace(/^\.\.\//, ''), text];
  })
);

/**
 * Каталог пути без завершающего имени.
 *
 * @param path — путь от корня репозитория
 * @returns каталог; у файла в корне — пустая строка
 */
const dirOf = (path: string): string => {
  return path.slice(0, Math.max(0, path.lastIndexOf('/')));
};

/**
 * Каталоги, в которых лежит хоть один файл кода.
 */
const CODE_DIRS = new Set(
  [...FILES.keys()].map((path) => {
    return dirOf(path);
  })
);

/**
 * Каталоги-модули: каталоги с кодом вне плоских областей.
 */
const MODULE_DIRS = [...CODE_DIRS].filter((dir) => {
  return !FLAT_AREAS.has(dir);
});

/**
 * Шаблон `paths` из `tsconfig.json`.
 */
type AliasPattern = {
  /**
   * Начало спецификатора: alias без `*`.
   */
  prefix: string;
  /**
   * Путь от корня репозитория, в который переходит начало, без `./` и `*`.
   */
  target: string;
  /**
   * Шаблон со `*` — alias с путём за ним; без `*` совпадает только целиком.
   */
  isWildcard: boolean;
};

/**
 * Шаблоны `paths` из `tsconfig.json`.
 */
const ALIASES = Object.entries(tsconfig.compilerOptions.paths).reduce<AliasPattern[]>(
  (acc, [pattern, [target]]) => {
    if (target) {
      const isWildcard = pattern.endsWith('/*');

      acc.push({
        prefix: isWildcard ? pattern.slice(0, -1) : pattern,
        target: (isWildcard ? target.slice(0, -1) : target).replace(/^\.\//, ''),
        isWildcard,
      });
    }

    return acc;
  },
  []
);

/**
 * Путь от корня репозитория, в который alias переводит спецификатор. Хвост `/index` шаблона
 * без `*` — его barrel: `@ui` ведёт в модуль пикера.
 *
 * @param specifier — спецификатор импорта
 * @returns путь без расширения; `null` — спецификатор не alias
 */
const aliasTarget = (specifier: string): string | null => {
  const alias = ALIASES.find(({ prefix, isWildcard }) => {
    return isWildcard ? specifier.startsWith(prefix) : specifier === prefix;
  });

  if (!alias) {
    return null;
  }

  if (!alias.isWildcard) {
    return alias.target.replace(/\/index$/, '');
  }

  return `${alias.target}${specifier.slice(alias.prefix.length)}`;
};

/**
 * Путь, в который относительный спецификатор ведёт из каталога файла.
 *
 * @param dir — каталог импортирующего файла
 * @param specifier — спецификатор, начинающийся с `./` или `../`
 * @returns путь от корня репозитория без `.` и `..`
 */
const relativeTarget = (dir: string, specifier: string): string => {
  return specifier
    .split('/')
    .reduce<string[]>((acc, part) => {
      switch (part) {
        case '.': {
          return acc;
        }

        case '..': {
          return acc.slice(0, -1);
        }

        default: {
          return [...acc, part];
        }
      }
    }, dir.split('/'))
    .join('/');
};

/**
 * Файл кода, в который разрешается путь без расширения.
 *
 * @param target — путь от корня репозитория
 * @returns путь файла; `null` — такого файла нет
 */
const codeFileOf = (target: string): string | null => {
  return (
    CODE_EXTENSIONS.map((extension) => {
      return `${target}${extension}`;
    }).find((path) => {
      return FILES.has(path);
    }) || null
  );
};

/**
 * Нарушение границы модуля: alias ведёт не в barrel и не в файл плоской области, а относительный
 * путь в `src/` — не в файл своего каталога и не в barrel модуля ниже. Файлы не кода (CSS,
 * JSON) проверяются так же по своему каталогу; каталог без кода (`_locales/`, корень
 * репозитория) — не модуль, и путь в него границу не нарушает. Несуществующий путь ловит
 * проверка типов.
 *
 * @param file — импортирующий файл
 * @param specifier — спецификатор без query (`?raw`)
 * @returns текст нарушения; `null` — импорт по правилам или вне проверки
 */
const violationOf = (file: string, specifier: string): string | null => {
  const isRelative = specifier.startsWith('.');
  const target = isRelative
    ? relativeTarget(dirOf(file), specifier)
    : aliasTarget(specifier);

  if (target === null || (isRelative && !file.startsWith('src/'))) {
    return null;
  }

  if (FILES.has(`${target}/index.ts`) && !specifier.endsWith('/index')) {
    return null;
  }

  const targetDir = dirOf(codeFileOf(target) || target);
  const isAllowed =
    !CODE_DIRS.has(targetDir) ||
    (isRelative ? targetDir === dirOf(file) : FLAT_AREAS.has(targetDir));

  return isAllowed
    ? null
    : `${file}: «${specifier}» ведёт в файл каталога ${targetDir} — нужен barrel модуля или alias файла плоской области`;
};

describe('структура модулей', () => {
  it('у каждого каталога-модуля есть barrel', () => {
    const missing = MODULE_DIRS.filter((dir) => {
      return !FILES.has(`${dir}/index.ts`);
    });

    expect(MODULE_DIRS.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it('импорт ведёт в barrel модуля или в файл плоской области', () => {
    const violations = [...FILES].flatMap(([file, text]) => {
      return [...text.matchAll(SPECIFIER_REGEX)].reduce<string[]>(
        (acc, [, imported, mocked]) => {
          const violation = violationOf(
            file,
            (imported || mocked || '').replace(/\?.*$/, '')
          );

          if (violation) {
            acc.push(violation);
          }

          return acc;
        },
        []
      );
    });

    expect(violations).toEqual([]);
  });
});
