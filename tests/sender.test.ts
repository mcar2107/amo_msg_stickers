import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ComposeMarkup, SendComposer } from '../src/core/amoDom.types';
import { legacyMarkup } from '../src/core/amoDomLegacy';
import { stableMarkup } from '../src/core/amoDomStable';
import { setLocale } from '../src/core/i18n/translate';
import type { PageClient, PageSendResult } from '../src/core/pageClient.types';
import { SendError, sendFile, toCheckedGifFile, toGifFile } from '../src/core/sender';

import { makeGif } from './helpers/makeGif';

const GIF_NAME = 'cat.amostk.k-gif.gif';

describe('toGifFile', () => {
  it.each([
    ['имя с меткой', '😀.amostk.k-sticker.gif'],
    ['имя без метки', 'amostk.k-sticker.gif'],
    ['имя без расширения', 'amostk.k-sticker'],
    ['имя с чужим расширением', 'sticker.png'],
  ])('кладёт %s в File.name как есть', (_case, name) => {
    const file = toGifFile(new Blob([makeGif(8, 8)]), name);

    expect(file.name).toBe(name);
    expect(file.type).toBe('image/gif');
  });
});

describe('toCheckedGifFile', () => {
  it('отдаёт GIF файлом image/gif с исходными байтами и переданным именем', async () => {
    const bytes = makeGif(8, 8, 2);
    const file = await toCheckedGifFile(
      new Blob([bytes], { type: 'text/html' }),
      GIF_NAME
    );

    expect(file.type).toBe('image/gif');
    expect(file.name).toBe(GIF_NAME);
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);
  });

  it.each([
    ['HTML', new Blob(['<html>404</html>'])],
    ['обрезанный GIF', new Blob([makeGif(16, 16).subarray(0, 30)])],
  ])('отклоняет %s', async (_name, blob) => {
    const result = toCheckedGifFile(blob, GIF_NAME);

    await expect(result).rejects.toBeInstanceOf(SendError);
    await expect(result).rejects.toThrow('Файл не похож на GIF');
  });

  it('в английском интерфейсе отклоняет с английским текстом', async () => {
    setLocale('en');

    await expect(
      toCheckedGifFile(new Blob(['<html>404</html>']), GIF_NAME)
    ).rejects.toThrow('The file does not look like a GIF');
  });
});

/**
 * Признак видимости кнопки, который читает разметка: прежняя — класс `opacity-100`, стабильная —
 * атрибут `data-visible`.
 */
type ShownSignal = 'class' | 'attribute';

/**
 * Поле ввода amo без DOM: «Отправить» видна, когда в поле есть текст или вложение, а
 * paste файла делает её видимой — как amo, принявший вложение. Видимость кнопка отдаёт только
 * признаком своей разметки: разметка, читающая чужой признак, считала бы кнопку скрытой.
 *
 * @param hasDraft — в поле уже есть текст
 * @param markup — разметка, в которой поле найдено
 * @param signal — признак видимости этой разметки
 * @returns композер и шпионы вставки и клика
 */
const fakeComposer = (hasDraft: boolean, markup: ComposeMarkup, signal: ShownSignal) => {
  let isSendShown = hasDraft;
  const paste = vi.fn(() => {
    isSendShown = true;

    return true;
  });
  const click = vi.fn();
  const composer: SendComposer = {
    editable: {
      focus: vi.fn(),
      dispatchEvent: paste,
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    },
    sendButton: {
      classList: {
        contains: (className) => {
          return signal === 'class' && className === 'opacity-100' && isSendShown;
        },
      },
      hasAttribute: (name) => {
        return signal === 'attribute' && name === 'data-visible' && isSendShown;
      },
      click,
    },
    cancelEditButton: null,
    markup,
  };

  return { click, composer, paste };
};

const clientAnswering = (result: PageSendResult): PageClient => {
  return {
    send: vi.fn(() => {
      return result;
    }),
  };
};

/**
 * Вставка без DOM: `DataTransfer` и `ClipboardEvent` в окружении `node` нет.
 */
const stubPaste = () => {
  vi.spyOn(console, 'info').mockImplementation(() => {
    return undefined;
  });
  vi.stubGlobal(
    'DataTransfer',
    class {
      readonly items = { add: vi.fn() };
    }
  );
  vi.stubGlobal('ClipboardEvent', class extends Event {});
};

describe.each<[string, ComposeMarkup, ShownSignal]>([
  ['прежняя разметка', legacyMarkup, 'class'],
  ['стабильная разметка', stableMarkup, 'attribute'],
])('sendFile, %s', (_name, markup, signal) => {
  const file = new File([makeGif(8, 8)], GIF_NAME, { type: 'image/gif' });

  it('amo принял в очередь — поле не трогается, «Отправить» не нажимается', async () => {
    const { click, composer, paste } = fakeComposer(true, markup, signal);
    const client = clientAnswering({ status: 'accepted' });

    await sendFile(composer, file, client);

    expect(client.send).toHaveBeenCalledWith(composer.editable, file, { w: 8, h: 8 });
    expect(paste).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });

  it('стороны в команде — из заголовка GIF: 300×70', async () => {
    const { composer } = fakeComposer(true, markup, signal);
    const client = clientAnswering({ status: 'accepted' });
    const wide = new File([makeGif(300, 70)], GIF_NAME, { type: 'image/gif' });

    await sendFile(composer, wide, client);

    expect(client.send).toHaveBeenCalledWith(composer.editable, wide, { w: 300, h: 70 });
  });

  it('стороны не читаются — агенту не шлётся, вставка и «Отправить»', async () => {
    stubPaste();

    const info = vi.mocked(console.info);

    const { click, composer, paste } = fakeComposer(false, markup, signal);
    const client = clientAnswering({ status: 'accepted' });
    const broken = new File(['<html>'], GIF_NAME, { type: 'image/gif' });

    await sendFile(composer, broken, client);

    expect(client.send).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(expect.stringContaining('(no-dims)'));
    expect(paste).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('очередь недоступна, поле пустое — вставка и «Отправить»', async () => {
    stubPaste();

    const { click, composer, paste } = fakeComposer(false, markup, signal);

    await sendFile(
      composer,
      file,
      clientAnswering({ status: 'unavailable', reason: 'no-agent' })
    );

    expect(paste).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('очередь недоступна, в поле текст — SendError без вставки', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {
      return undefined;
    });

    const { click, composer, paste } = fakeComposer(true, markup, signal);

    await expect(
      sendFile(
        composer,
        file,
        clientAnswering({ status: 'unavailable', reason: 'no-client' })
      )
    ).rejects.toBeInstanceOf(SendError);
    expect(paste).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });
});

/**
 * Поле ввода, в котором «Отправить» не смонтирована, пока вложение не готово: после вставки
 * сначала появляется полоса вложений (черновик уже не пуст), а кнопка — только на
 * `buttonAfterPolls + 1`-й вопрос о ней.
 *
 * @param buttonAfterPolls — сколько вопросов после вставки кнопки ещё нет
 * @returns композер и шпионы вставки и клика
 */
const lateButtonComposer = (buttonAfterPolls: number) => {
  let isPasted = false;
  let polls = 0;
  const click = vi.fn();
  const paste = vi.fn(() => {
    isPasted = true;

    return true;
  });
  const markup: ComposeMarkup = {
    isEditing: () => {
      return false;
    },
    isDraftEmpty: () => {
      return !isPasted;
    },
    sendButtonOf: () => {
      if (!isPasted) return null;
      polls += 1;

      return polls > buttonAfterPolls ? { click } : null;
    },
  };
  const composer: SendComposer = {
    editable: {
      focus: vi.fn(),
      dispatchEvent: paste,
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    },
    sendButton: null,
    cancelEditButton: null,
    markup,
  };

  return { click, composer, paste };
};

describe('sendFile, «Отправить» появляется после вложения', () => {
  const file = new File([makeGif(8, 8)], GIF_NAME, { type: 'image/gif' });
  const unavailable = clientAnswering({ status: 'unavailable', reason: 'no-agent' });

  it('кнопка, появившаяся после вставки, нажимается один раз', async () => {
    vi.useFakeTimers();
    stubPaste();

    const { click, composer, paste } = lateButtonComposer(3);
    const sending = sendFile(composer, file, unavailable);

    await vi.advanceTimersByTimeAsync(2000);
    await sending;

    expect(paste).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('полоса вложений без кнопки — не готово: SendError через 15 с без клика', async () => {
    vi.useFakeTimers();
    stubPaste();

    const { click, composer } = lateButtonComposer(Number.POSITIVE_INFINITY);
    const sending = expect(sendFile(composer, file, unavailable)).rejects.toBeInstanceOf(
      SendError
    );

    await vi.advanceTimersByTimeAsync(16_000);
    await sending;

    expect(click).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  vi.useRealTimers();
  setLocale('ru');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
