import { afterEach, describe, expect, it } from 'vitest';

import type { RemoteGif } from '@core/db.types';
import { setLocale } from '@core/i18n';
import { gifCellName, stickerCellName } from '@ui/cellName';

/**
 * GIF из поиска с заданным названием.
 *
 * @param title — название GIF; `undefined` — без названия
 * @returns GIF из поиска
 */
const gif = (title?: string): RemoteGif => {
  return {
    id: 'giphy:1',
    provider: 'giphy',
    url: 'u',
    previewUrl: 'p',
    width: 1,
    height: 1,
    ...(title === undefined ? {} : { title }),
  };
};

afterEach(() => {
  setLocale('ru');
});

describe('stickerCellName', () => {
  it('у стикера с подписью имя — подпись, а не эмодзи', () => {
    expect(stickerCellName({ emoji: '😀', caption: 'привет' })).toEqual({
      send: 'Отправить стикер «привет»',
      menu: 'Действия: стикер «привет»',
      preview: 'Предпросмотр стикера «привет»',
    });
  });

  it('у стикера без подписи имя — эмодзи', () => {
    expect(stickerCellName({ emoji: '😀' })).toEqual({
      send: 'Отправить стикер 😀',
      menu: 'Действия: стикер 😀',
      preview: 'Предпросмотр стикера 😀',
    });
  });

  it('пустая подпись не считается подписью', () => {
    expect(stickerCellName({ emoji: '😀', caption: '' }).send).toBe(
      'Отправить стикер 😀'
    );
    expect(stickerCellName({ emoji: '😀', caption: '' }).preview).toBe(
      'Предпросмотр стикера 😀'
    );
  });

  it('без подписи и эмодзи — просто «стикер»', () => {
    expect(stickerCellName({ emoji: '' })).toEqual({
      send: 'Отправить стикер',
      menu: 'Действия: стикер',
      preview: 'Предпросмотр стикера',
    });
  });

  it('на английском — английская фраза, подпись без перевода', () => {
    setLocale('en');

    expect(stickerCellName({ emoji: '😀', caption: 'hi' })).toEqual({
      send: 'Send sticker “hi”',
      menu: 'Actions: sticker “hi”',
      preview: 'Preview of sticker “hi”',
    });
    expect(stickerCellName({ emoji: '😀', caption: 'привет' }).send).toBe(
      'Send sticker “привет”'
    );
    expect(stickerCellName({ emoji: '😀', caption: 'привет' }).preview).toBe(
      'Preview of sticker “привет”'
    );
    expect(stickerCellName({ emoji: '😀' }).preview).toBe('Preview of sticker 😀');
    expect(stickerCellName({ emoji: '' }).preview).toBe('Preview of sticker');
    expect(stickerCellName({ emoji: '😀' }).send).toBe('Send sticker 😀');
    expect(stickerCellName({ emoji: '' }).send).toBe('Send sticker');
  });
});

describe('gifCellName', () => {
  it('у GIF с названием имя — название', () => {
    expect(gifCellName(gif('cat'))).toEqual({
      send: 'Отправить GIF «cat»',
      menu: 'Действия: GIF «cat»',
      preview: 'Предпросмотр GIF «cat»',
    });
  });

  it('без названия — просто «GIF»', () => {
    expect(gifCellName(gif())).toEqual({
      send: 'Отправить GIF',
      menu: 'Действия: GIF',
      preview: 'Предпросмотр GIF',
    });
  });

  it('на английском — английская фраза, название без перевода', () => {
    setLocale('en');

    expect(gifCellName(gif('кот'))).toEqual({
      send: 'Send GIF “кот”',
      menu: 'Actions: GIF “кот”',
      preview: 'Preview of GIF “кот”',
    });
    expect(gifCellName(gif()).send).toBe('Send GIF');
    expect(gifCellName(gif()).preview).toBe('Preview of GIF');
  });
});
