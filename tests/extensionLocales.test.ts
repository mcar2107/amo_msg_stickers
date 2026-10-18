import { describe, expect, it } from 'vitest';

import messagesEn from '@extension/_locales/en/messages.json';
import messagesRu from '@extension/_locales/ru/messages.json';
import manifest from '@extension/manifest.json';

import buildSource from '../build.mjs?raw';

/**
 * Копирование каталога переводов в сборку расширения: без него `__MSG_…__` в
 * manifest не разрешится, и Chrome откажется загружать расширение.
 */
const LOCALES_COPY =
  "cpSync('src/extension/_locales', 'dist/extension/_locales', { recursive: true })";

describe('переводы метаданных расширения', () => {
  it('manifest берёт описание из переводов, запасной язык — русский', () => {
    expect(manifest).toMatchObject({
      default_locale: 'ru',
      description: '__MSG_extDescription__',
      name: 'amo stickers',
    });
  });

  it.each([
    ['ru', messagesRu],
    ['en', messagesEn],
  ])('в %s есть непустое описание', (_locale, messages) => {
    expect(messages.extDescription.message.trim()).not.toBe('');
  });

  it('описания на двух языках различаются', () => {
    expect(messagesEn.extDescription.message).not.toBe(messagesRu.extDescription.message);
  });

  it('сборка копирует переводы в dist/extension', () => {
    expect(buildSource).toContain(LOCALES_COPY);
  });
});
