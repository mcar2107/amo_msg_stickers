import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Host } from '@core/host.types';
import type { GmXmlhttpRequest } from '@userscript/gm.types';

/**
 * Ядро с пикером и DOM amo тесту не нужно: проверяется только `Host`, который точка входа
 * передаёт в `start`.
 */
vi.mock('@core/app', () => {
  return { start: vi.fn() };
});

/**
 * Виртуальный модуль esbuild-плагина vitest не собирает: код агента подменён меткой.
 */
vi.mock('page-agent:code', () => {
  return { PAGE_AGENT_CODE: '/* agent */' };
});

const TG_URL = 'https://api.telegram.org/bot1:x/getMe';

/**
 * Порядок событий старта: внедрение агента и вызов `start`.
 */
const bootOrder: string[] = [];

/**
 * `<script>` агента, как его видит заглушка документа.
 */
type EntryScript = {
  /**
   * Код агента.
   */
  textContent: string;
};

/**
 * `document` точки входа: загружен, `<script>` агента пишет в `bootOrder` свою вставку и
 * удаление.
 *
 * @returns заглушка документа
 */
const entryDocument = () => {
  return {
    body: {},
    readyState: 'complete',
    head: {
      append: (script: EntryScript) => {
        bootOrder.push(`inject:${script.textContent}`);
      },
    },
    createElement: () => {
      return {
        textContent: '',
        remove: () => {
          bootOrder.push('remove');
        },
      };
    },
  };
};

/**
 * Запускает точку входа userscript заново: режим выбирается при импорте модуля по тому,
 * какие `GM_*` лежат в глобальной области к этому моменту.
 *
 * @returns `Host`, переданный в `start`
 */
const bootHost = async () => {
  vi.resetModules();
  await import('@userscript/index');
  const { start } = await import('@core/app');
  const host = vi.mocked(start).mock.calls[0]?.[0];

  if (!host) throw new Error('start не вызван');

  return host;
};

/**
 * Мок `GM_xmlhttpRequest`: сразу отдаёт успешный JSON.
 *
 * @returns мок запроса
 */
const gmRequest = () => {
  return vi.fn<GmXmlhttpRequest>((details) => {
    details.onload({ status: 200, readyState: 4, responseHeaders: '', response: '{}' });

    return { abort: vi.fn() };
  });
};

/**
 * Запись настроек через `Host`: по тому, куда она ушла, видно выбранное хранилище.
 *
 * @param host — `Host` точки входа
 */
const writeSettings = async (host: Host) => {
  await host.setSettings({ giphyKey: 'g' });
};

/**
 * Пустой `localStorage` страницы, каждый метод — шпион.
 *
 * @returns мок хранилища
 */
const emptyLocalStorage = () => {
  return {
    getItem: vi.fn(() => {
      return null;
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
};

let fetchMock = vi.fn();
let localStorageMock = emptyLocalStorage();

beforeEach(() => {
  fetchMock = vi.fn(async () => {
    return new Response('{}', { status: 200 });
  });
  localStorageMock = emptyLocalStorage();
  bootOrder.length = 0;
  vi.stubGlobal('document', entryDocument());
  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('userscript: выбор сети', () => {
  it('есть GM_xmlhttpRequest — запросы идут через менеджер', async () => {
    const request = gmRequest();

    vi.stubGlobal('GM_xmlhttpRequest', request);
    const host = await bootHost();

    await host.fetchJson(TG_URL);

    expect(request).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('нет GM_xmlhttpRequest — прямой fetch', async () => {
    const host = await bootHost();

    await host.fetchJson(TG_URL);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('GM_xmlhttpRequest не функция — прямой fetch', async () => {
    vi.stubGlobal('GM_xmlhttpRequest', {});
    const host = await bootHost();

    await host.fetchJson(TG_URL);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('userscript: выбор настроек', () => {
  it('есть GM_getValue и GM_setValue — запись в менеджер, не в localStorage', async () => {
    const setValue = vi.fn();

    vi.stubGlobal('GM_getValue', vi.fn());
    vi.stubGlobal('GM_setValue', setValue);
    const host = await bootHost();

    await writeSettings(host);

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('только GM_getValue — настройки в localStorage', async () => {
    vi.stubGlobal('GM_getValue', vi.fn());
    const host = await bootHost();

    await writeSettings(host);

    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
  });

  it('только GM_setValue — настройки в localStorage', async () => {
    const setValue = vi.fn();

    vi.stubGlobal('GM_setValue', setValue);
    const host = await bootHost();

    await writeSettings(host);

    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(setValue).not.toHaveBeenCalled();
  });

  it('без менеджера — настройки в localStorage', async () => {
    const host = await bootHost();

    await writeSettings(host);

    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
  });
});

describe('userscript: агент в мире страницы', () => {
  it('внедряется элементом <script> до start и сразу удаляется', async () => {
    const { start } = await import('@core/app');

    vi.mocked(start).mockImplementation(() => {
      bootOrder.push('start');
    });
    await bootHost();

    expect(bootOrder).toEqual(['inject:/* agent */', 'remove', 'start']);
  });

  it('документ грузится — агент сразу, start по DOMContentLoaded', async () => {
    const { start } = await import('@core/app');
    const target = new EventTarget();

    vi.mocked(start).mockImplementation(() => {
      bootOrder.push('start');
    });
    vi.stubGlobal('document', {
      ...entryDocument(),
      body: null,
      head: null,
      readyState: 'loading',
      documentElement: {
        append: (script: EntryScript) => {
          bootOrder.push(`inject:${script.textContent}`);
        },
      },
      addEventListener: target.addEventListener.bind(target),
    });
    vi.resetModules();
    await import('@userscript/index');

    expect(bootOrder).toEqual(['inject:/* agent */', 'remove']);

    target.dispatchEvent(new Event('DOMContentLoaded'));
    target.dispatchEvent(new Event('DOMContentLoaded'));

    expect(bootOrder).toEqual(['inject:/* agent */', 'remove', 'start']);
  });

  it('у документа ещё нет корня — агент вставляется в сам документ', async () => {
    vi.stubGlobal('document', {
      ...entryDocument(),
      body: null,
      head: null,
      documentElement: null,
      readyState: 'loading',
      append: (script: EntryScript) => {
        bootOrder.push(`inject:${script.textContent}`);
      },
      addEventListener: vi.fn(),
    });
    vi.resetModules();
    await import('@userscript/index');

    expect(bootOrder).toEqual(['inject:/* agent */', 'remove']);
  });

  it('сбой вставки агента не мешает старту ядра', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined;
    });
    const { start } = await import('@core/app');

    vi.mocked(start).mockImplementation(() => {
      bootOrder.push('start');
    });
    vi.stubGlobal('document', {
      ...entryDocument(),
      createElement: () => {
        throw new TypeError('This document requires TrustedScript assignment');
      },
    });
    await bootHost();

    expect(bootOrder).toEqual(['start']);
    expect(warn).toHaveBeenCalledWith(
      '[amo-stickers] page agent not injected:',
      expect.any(TypeError)
    );
    warn.mockRestore();
  });
});
