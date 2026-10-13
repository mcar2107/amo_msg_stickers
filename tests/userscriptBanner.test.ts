import { describe, expect, it } from 'vitest';

import buildSource from '../build.mjs?raw';
import { ALLOWED_DOMAINS, ALLOWED_HOSTS } from '../src/core/net';

/**
 * Хост директивы `@connect` в строке заголовка userscript внутри `build.mjs`.
 */
const CONNECT_PATTERN = /\/\/ @connect\s+(\S+?)'/g;

/**
 * Описание в заголовке userscript: русское — без суффикса языка, его менеджер
 * показывает по умолчанию; английское — с суффиксом `:en`, его менеджер
 * выбирает по языку браузера. Текст описания — кириллица и латиница
 * соответственно, иначе строка с суффиксом не отличалась бы от перевода.
 */
const DESCRIPTION_RU_PATTERN = /'\/\/ @description\s+[^':]*[А-Яа-яЁё][^']*'/;
const DESCRIPTION_EN_PATTERN = /'\/\/ @description:en\s+[A-Za-z][^'А-Яа-яЁё]*'/;

/**
 * Директива названия: `@name` без суффикса и с ним — название одно на все языки.
 */
const NAME_PATTERN = /\/\/ @name\S*\s/g;

/**
 * Строковый литерал обёртки userscript в `build.mjs`; `\n` в нём записан escape-ом.
 */
const WRAP_START_PATTERN = /const USERSCRIPT_WRAP_START = '(.*)';/;
const WRAP_END_PATTERN = /const USERSCRIPT_WRAP_END = '(.*)';/;

/**
 * Параметры, с которыми Userscripts для Safari (4.x) исполняет код скрипта:
 * деструктуризация делает список параметров «непростым».
 */
const SAFARI_PARAMS = '{GM_xmlhttpRequest,GM_getValue,GM_setValue}';

/**
 * Начало бандла esbuild при `strict` в `tsconfig`: директива первой строкой.
 */
const ESBUILD_PROLOGUE = '"use strict";(()=>{})();';

/**
 * Файл userscript последнего релиза: `latest` — наибольшая версия, поэтому менеджер
 * находит по этому адресу каждое следующее обновление.
 */
const LATEST_USERSCRIPT_URL =
  'https://github.com/mcar2107/amo_msg_stickers/releases/latest/download/amo-stickers.user.js';

/**
 * Литерал адреса обновления в `build.mjs`.
 */
const UPDATE_URL_PATTERN = /const LATEST_USERSCRIPT_URL =\s*'([^']*)';/;

/**
 * Директивы автообновления в ветке боевой сборки: при `isWatch` — пустой список.
 */
const UPDATE_DIRECTIVES_PATTERN =
  /const updateDirectives = isWatch\s*\?\s*\[\]\s*:\s*\[([\s\S]*?)\];/;

/**
 * Директива автообновления в любом месте `build.mjs`.
 */
const UPDATE_DIRECTIVE_PATTERN = /@(?:updateURL|downloadURL)\b/g;

/**
 * Значение литерала обёртки из `build.mjs`.
 *
 * @param pattern — регулярка с литералом в первой группе
 * @returns строка обёртки с настоящими переводами строк
 */
const readWrap = (pattern: RegExp) => {
  const [, literal] = buildSource.match(pattern) || [];

  return (literal || '').replaceAll(String.raw`\n`, '\n');
};

describe('заголовок userscript', () => {
  it('@connect перечисляет ровно хосты сетевой политики', () => {
    const connectHosts = Array.from(buildSource.matchAll(CONNECT_PATTERN), ([, host]) => {
      return host;
    });

    expect(connectHosts.sort()).toEqual([...ALLOWED_HOSTS, ...ALLOWED_DOMAINS].sort());
  });

  it('описание на русском по умолчанию и на английском, название одно', () => {
    expect(buildSource).toMatch(DESCRIPTION_RU_PATTERN);
    expect(buildSource).toMatch(DESCRIPTION_EN_PATTERN);
    expect(buildSource.match(NAME_PATTERN)).toHaveLength(1);
  });

  it('обёртка стоит в banner и footer сборки userscript', () => {
    expect(buildSource).toContain(
      'banner: { js: `${USERSCRIPT_BANNER}\\n${USERSCRIPT_WRAP_START}` }'
    );
    expect(buildSource).toContain('footer: { js: USERSCRIPT_WRAP_END }');
  });

  it('автообновление с последнего релиза — только в боевой сборке', () => {
    const [, updateUrl] = buildSource.match(UPDATE_URL_PATTERN) || [];
    const [, directives] = buildSource.match(UPDATE_DIRECTIVES_PATTERN) || [];

    expect(updateUrl).toBe(LATEST_USERSCRIPT_URL);
    expect(directives).toContain('`// @updateURL    ${LATEST_USERSCRIPT_URL}`');
    expect(directives).toContain('`// @downloadURL  ${LATEST_USERSCRIPT_URL}`');
    expect(buildSource.match(UPDATE_DIRECTIVE_PATTERN)).toHaveLength(2);
    expect(buildSource).toMatch(/'\/\/ @run-at[^']*',\s*\.\.\.updateDirectives,/);
  });

  it('запуск до скриптов страницы — агент ловит ядро Worker-версии amo web при его создании', () => {
    expect(buildSource).toContain("'// @run-at       document-start'");
  });

  it('код в обёртке разбирается как тело функции Userscripts для Safari', () => {
    const code = `${readWrap(WRAP_START_PATTERN)}\n${ESBUILD_PROLOGUE}\n${readWrap(WRAP_END_PATTERN)}`;

    expect(() => {
      return Function(SAFARI_PARAMS, ESBUILD_PROLOGUE);
    }).toThrow(SyntaxError);
    expect(() => {
      return Function(SAFARI_PARAMS, code);
    }).not.toThrow();
  });
});
