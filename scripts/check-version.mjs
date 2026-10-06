/**
 * Проверка версии для CI: версия в `package.json` в формате `MAJOR.MINOR.PATCH`, а с
 * `--base <ref>` — не ниже, чем в `package.json` базы. Ошибки печатаются аннотациями
 * GitHub (`::error::`), код выхода 1.
 *
 * Запуск: `node scripts/check-version.mjs [--base origin/master]`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { checkVersionNotLower, parseVersion, toErrorAnnotation } from './version.ts';

const git = (args) => {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
};

const reportError = (message) => {
  console.error(toErrorAnnotation(message));
  process.exitCode = 1;
};

const {
  values: { base },
} = parseArgs({ options: { base: { type: 'string' } } });

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

try {
  /**
   * Формат — до сравнения и без `--base`: битую версию сборка молча положила бы в manifest,
   * и её отверг бы только Chrome при установке.
   */
  parseVersion(String(version));

  if (base) {
    const baseVersion = JSON.parse(git(['show', `${base}:package.json`])).version;
    const lowerError = checkVersionNotLower(version, baseVersion);

    if (lowerError) {
      reportError(lowerError);
    }
  }
} catch (error) {
  reportError(error.message);
}

if (!process.exitCode) {
  console.info(`Версия ${version}: проверка пройдена`);
}
