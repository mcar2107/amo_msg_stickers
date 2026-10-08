import { describe, expect, it } from 'vitest';

import type { RemoteGif } from '../src/core/db.types';
import {
  gifCellId,
  gifItemCellId,
  gifKey,
} from '../src/core/ui/Picker/MasonryGrid/gifCellId';

/**
 * GIF провайдера с номером.
 *
 * @param provider — провайдер выдачи
 * @param id — номер GIF у провайдера
 * @returns GIF
 */
const gif = (provider: RemoteGif['provider'], id: string): RemoteGif => {
  return {
    id,
    provider,
    url: `https://example.com/${id}.gif`,
    previewUrl: `https://example.com/${id}-preview.gif`,
    width: 200,
    height: 100,
  };
};

describe('gifKey', () => {
  it('ключ составлен из провайдера и id', () => {
    expect(gifKey(gif('klipy', '42'))).toBe('klipy:42');
  });

  it('один id у разных провайдеров даёт разные ключи', () => {
    expect(gifKey(gif('giphy', '42'))).not.toBe(gifKey(gif('klipy', '42')));
  });
});

describe('gifCellId', () => {
  it('id кнопки ячейки строится из раздела и ключа GIF', () => {
    expect(gifCellId('recent', 'giphy:42')).toBe('picker-gif-cell-recent-giphy:42');
  });

  it('та же GIF в недавних и в выдаче получает разные id', () => {
    expect(gifCellId('recent', 'giphy:42')).not.toBe(gifCellId('feed', 'giphy:42'));
  });
});

describe('gifItemCellId', () => {
  it('id кнопки ячейки по GIF совпадает с id по её ключу', () => {
    expect(gifItemCellId('feed', gif('giphy', '42'))).toBe(gifCellId('feed', 'giphy:42'));
  });
});
