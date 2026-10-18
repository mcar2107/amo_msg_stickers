import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadBlob, REVOKE_DELAY_MS } from '@core/download';

/**
 * Ссылка-заглушка: запоминает, что в неё записали, и отмечает клик.
 */
type FakeAnchor = {
  /**
   * Адрес, по которому браузер скачает файл.
   */
  href: string;

  /**
   * Имя файла в загрузках.
   */
  download: string;

  /**
   * Клик, который запускает скачивание.
   */
  click: ReturnType<typeof vi.fn>;
};

describe('downloadBlob', () => {
  let anchors: FakeAnchor[];
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let appendChild: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    anchors = [];
    createObjectURL = vi.fn().mockReturnValue('blob:test/1');
    revokeObjectURL = vi.fn();
    appendChild = vi.fn();

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        expect(tag).toBe('a');
        const anchor: FakeAnchor = { href: '', download: '', click: vi.fn() };

        anchors.push(anchor);

        return anchor;
      },
      body: { appendChild },
      documentElement: { appendChild },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('скачивает блоб по ссылке с именем файла, не вставляя её в DOM', () => {
    const blob = new Blob(['x']);

    downloadBlob(blob, 'Котики.amostickers');

    expect(createObjectURL).toHaveBeenCalledExactlyOnceWith(blob);
    expect(anchors).toHaveLength(1);

    const [anchor] = anchors;

    expect(anchor?.href).toBe('blob:test/1');
    expect(anchor?.download).toBe('Котики.amostickers');
    expect(anchor?.click).toHaveBeenCalledOnce();
    expect(appendChild).not.toHaveBeenCalled();
  });

  it('отзывает адрес не сразу, а после задержки', () => {
    downloadBlob(new Blob(['x']), 'a.amostickers');

    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(REVOKE_DELAY_MS - 1);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:test/1');
  });
});
