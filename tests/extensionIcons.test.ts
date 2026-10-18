import { describe, expect, it } from 'vitest';

import {
  ACTION_ICON_PATHS,
  actionIconPaths,
  isIconThemeMessage,
} from '@extension/actionIcon';
import manifest from '@extension/manifest.json';

import buildSource from '../build.mjs?raw';

/**
 * Иконка userscript в `build.mjs`: data URI из файла иконки расширения.
 */
const USERSCRIPT_ICON_PATTERN =
  /readFileSync\('src\/extension\/(icons\/icon\d+\.png)'\)\.toString\('base64'\)/;

const ICON_PATHS = Object.values(manifest.icons);

const ACTION_PATHS = [
  ...Object.values(ACTION_ICON_PATHS.light),
  ...Object.values(ACTION_ICON_PATHS.dark),
];

describe('иконки расширения и userscript', () => {
  it.each([...ICON_PATHS, ...ACTION_PATHS])(
    'файл %s есть в src/extension/',
    async (path) => {
      /**
       * Импорт падает, если файла нет: иначе ошибка всплыла бы только при загрузке
       * расширения в браузер. Адрес — в переменной с `@vite-ignore`, как в тесте
       * страниц доки.
       */
      const specifier = `../src/extension/${path}?raw`;
      const { default: source } = await import(/* @vite-ignore */ specifier);

      expect(source.length).toBeGreaterThan(0);
    }
  );

  it('иконки копируются в сборку расширения', () => {
    expect(buildSource).toContain("cpSync('src/extension/icons', 'dist/extension/icons'");
  });

  it('userscript берёт иконку из иконок manifest', () => {
    const path = USERSCRIPT_ICON_PATTERN.exec(buildSource)?.[1];

    expect(ICON_PATHS).toContain(path);
    expect(buildSource).toMatch(/`\/\/ @icon\s+\$\{USERSCRIPT_ICON\}`/);
  });

  it('кнопка стартует со светлой иконкой — той же, что ставит светлая тема', () => {
    expect(manifest.action.default_icon).toEqual(ACTION_ICON_PATHS.light);
  });

  it('тёмная тема браузера — тёмные иконки кнопки, светлая — светлые', () => {
    expect(actionIconPaths(true)).toBe(ACTION_ICON_PATHS.dark);
    expect(actionIconPaths(false)).toBe(ACTION_ICON_PATHS.light);
  });

  it.each([
    [{ type: 'amo-stickers:icon-theme', isDark: true }, true],
    [{ type: 'amo-stickers:icon-theme', isDark: false }, true],
    [{ type: 'amo-stickers:icon-theme', isDark: 'true' }, false],
    [{ type: 'amo-stickers:icon-theme' }, false],
    [{ type: 'amo-stickers:fetch', isDark: true }, false],
    [null, false],
    ['amo-stickers:icon-theme', false],
  ])('сообщение %j о теме — %s', (msg, expected) => {
    expect(isIconThemeMessage(msg)).toBe(expected);
  });
});
