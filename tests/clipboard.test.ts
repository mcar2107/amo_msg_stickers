import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyText } from '@core/clipboard';

describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('пишет текст в буфер и сообщает об успехе', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyText('https://t.me/addstickers/Name')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledExactlyOnceWith('https://t.me/addstickers/Name');
  });

  it('отказ браузера — false, без исключения', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));

    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyText('x')).resolves.toBe(false);
  });

  it('без Clipboard API — false', async () => {
    vi.stubGlobal('navigator', {});

    await expect(copyText('x')).resolves.toBe(false);
  });

  it('без navigator — false', async () => {
    vi.stubGlobal('navigator', undefined);

    await expect(copyText('x')).resolves.toBe(false);
  });
});
