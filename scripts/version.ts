/**
 * Логика проверки версии для CI. Только стираемый синтаксис TS и без рантайм-импортов
 * (`import type` Node удаляет целиком): `scripts/check-version.mjs` импортирует модуль
 * напрямую, а Node снимает типы сам, без сборки.
 */

import type { Version } from './version.types';

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Разбирает `MAJOR.MINOR.PATCH`. Пре-релизы и метки сборки не поддерживаются:
 * версия расширения Chrome их не допускает.
 *
 * @param value — строка версии
 * @returns компоненты версии числами
 * @throws {Error} строка не в формате `MAJOR.MINOR.PATCH`
 */
export const parseVersion = (value: string): Version => {
  const match = VERSION_PATTERN.exec(value);

  if (!match) {
    throw new Error(`Версия «${value}» не в формате MAJOR.MINOR.PATCH`);
  }

  const [, major, minor, patch] = match;

  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
};

/**
 * Сравнивает по числам, а не по строке: `0.10.0` выше `0.9.0`.
 *
 * @param left — первая версия
 * @param right — вторая версия
 * @returns положительное число, если `left` выше, отрицательное — если ниже, 0 — если равны
 */
export const compareVersions = (left: Version, right: Version): number => {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
};

/**
 * Равная версия проходит: PR без подъёма — штатный случай, версию поднимает PR релиза. Ниже —
 * ошибка: такой мерж увёл бы `master` назад, а релиз с меньшей версией не примет Chrome Web Store и не обновит
 * менеджер userscript.
 *
 * @param current — версия ветки
 * @param base — версия базовой ветки (`master`)
 * @returns текст ошибки, если версия ветки ниже базы; `undefined` — равна или выше
 * @throws {Error} одна из версий не в формате `MAJOR.MINOR.PATCH`
 */
export const checkVersionNotLower = (
  current: string,
  base: string
): string | undefined => {
  if (compareVersions(parseVersion(current), parseVersion(base)) >= 0) {
    return undefined;
  }

  return `Версия ${current} ниже ${base} в базовой ветке`;
};

/**
 * Аннотация ошибки GitHub Actions. Перевод строки обрывает workflow command, поэтому
 * `%`, `\r` и `\n` экранируются по её правилам — иначе в аннотацию попала бы только
 * первая строка многострочной ошибки (например, `git show` с причиной `fatal: …`).
 * Хвостовой перевод строки (им кончается stderr) срезается: в аннотации он дал бы
 * пустую последнюю строку.
 *
 * @param message — текст ошибки, возможно многострочный
 * @returns строка `::error::…` для вывода в лог
 */
export const toErrorAnnotation = (message: string): string => {
  const escaped = message
    .trimEnd()
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');

  return `::error::${escaped}`;
};
