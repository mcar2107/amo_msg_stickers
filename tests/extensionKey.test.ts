import { describe, expect, it } from 'vitest';

import manifest from '@extension/manifest.json';

/**
 * ID карточки в Chrome Web Store. Архив из релиза получает его же только с ключом этой карточки: с другим ключом
 * распакованное расширение и версия из стора — разные установки со своими настройками.
 */
const STORE_EXTENSION_ID = 'abjnjphijggkkdbbmkldhibgepgdcgip';

/**
 * Первая буква алфавита ID: Chrome пишет шестнадцатеричную цифру `n` буквой со сдвигом `n` от `a`.
 */
const ID_ALPHABET_START = 'a'.codePointAt(0) || 0;

/**
 * Длина ID: Chrome берёт первые 16 байт хеша ключа, по букве на каждую из их 32 шестнадцатеричных цифр.
 */
const ID_LENGTH = 32;

/**
 * Ключ из manifest в байтах DER. Web Crypto, а не `node:crypto`: типов Node в проекте нет, а `crypto.subtle` и
 * `atob` описаны в lib DOM и есть в Node.
 *
 * @param key — публичный ключ из manifest, base64 DER
 * @returns байты ключа
 */
const keyBytes = (key: string) => {
  return Uint8Array.from(atob(key), (char) => {
    return char.codePointAt(0) || 0;
  });
};

/**
 * ID расширения так, как его считает Chrome: SHA-256 от DER ключа, первые 16 байт, каждая шестнадцатеричная цифра
 * `0–f` — буква `a–p`.
 *
 * @param key — публичный ключ из manifest, base64 DER
 * @returns ID расширения
 */
const extensionId = async (key: string) => {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', keyBytes(key)));
  const hex = [...hash]
    .map((byte) => {
      return byte.toString(16).padStart(2, '0');
    })
    .join('')
    .slice(0, ID_LENGTH);

  return [...hex]
    .map((digit) => {
      return String.fromCodePoint(ID_ALPHABET_START + Number.parseInt(digit, 16));
    })
    .join('');
};

describe('ключ расширения', () => {
  it('разбирается как публичный ключ', async () => {
    await expect(
      crypto.subtle.importKey(
        'spki',
        keyBytes(manifest.key),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        true,
        ['verify']
      )
    ).resolves.toBeDefined();
  });

  it('даёт ID карточки Chrome Web Store', async () => {
    await expect(extensionId(manifest.key)).resolves.toBe(STORE_EXTENSION_ID);
  });
});
