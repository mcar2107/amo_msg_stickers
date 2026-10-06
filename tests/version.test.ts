import { describe, expect, it } from 'vitest';

import {
  checkVersionNotLower,
  compareVersions,
  parseVersion,
  toErrorAnnotation,
} from '../scripts/version';

describe('parseVersion', () => {
  it('разбирает MAJOR.MINOR.PATCH в числа', () => {
    expect(parseVersion('1.20.3')).toEqual({ major: 1, minor: 20, patch: 3 });
  });

  it.each(['0.3', 'v0.3.0', '0.3.0-beta', '', 'a.b.c'])('отклоняет «%s»', (value) => {
    expect(() => {
      return parseVersion(value);
    }).toThrow('MAJOR.MINOR.PATCH');
  });
});

describe('compareVersions', () => {
  it('сравнивает по числам, а не по строке', () => {
    expect(
      compareVersions(parseVersion('0.10.0'), parseVersion('0.9.0'))
    ).toBeGreaterThan(0);
  });

  it('мажор важнее минора и патча', () => {
    expect(
      compareVersions(parseVersion('1.0.0'), parseVersion('0.99.99'))
    ).toBeGreaterThan(0);
  });

  it('равные версии дают 0', () => {
    expect(compareVersions(parseVersion('0.3.0'), parseVersion('0.3.0'))).toBe(0);
  });
});

describe('checkVersionNotLower', () => {
  it.each([
    ['0.19.0', '0.18.1'],
    ['0.10.0', '0.9.0'],
    ['1.0.0', '0.9.0'],
    ['0.18.1', '0.18.1'],
  ])('%s не ниже %s — проходит', (current, base) => {
    expect(checkVersionNotLower(current, base)).toBeUndefined();
  });

  it.each([
    ['0.2.0', '0.3.0'],
    ['0.9.0', '0.10.0'],
    ['0.18.1', '1.0.0'],
  ])('%s ниже %s — ошибка', (current, base) => {
    expect(checkVersionNotLower(current, base)).toContain('ниже');
  });

  it('падает на невалидной версии базы', () => {
    expect(() => {
      return checkVersionNotLower('0.3.0', 'master');
    }).toThrow('MAJOR.MINOR.PATCH');
  });
});

describe('toErrorAnnotation', () => {
  it('держит многострочную ошибку в одной аннотации', () => {
    expect(toErrorAnnotation('Command failed\nfatal: invalid object')).toBe(
      '::error::Command failed%0Afatal: invalid object'
    );
  });

  it('экранирует %, \\r и \\n, не задваивая %', () => {
    expect(toErrorAnnotation('100%\r\nok')).toBe('::error::100%25%0D%0Aok');
  });

  it('срезает хвостовой перевод строки', () => {
    expect(toErrorAnnotation('fatal: invalid object\n')).toBe(
      '::error::fatal: invalid object'
    );
  });
});
