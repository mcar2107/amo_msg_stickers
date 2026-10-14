import { describe, expect, it } from 'vitest';

import { markRows, rowsOf, watchFeedRows } from '../src/page/markRows';
import type { FeedMutation } from '../src/page/markRows.types';
import {
  MARK_HEIGHT_VAR,
  MARK_KIND_ATTR,
  MARK_WIDTH_VAR,
} from '../src/shared/stickerMark';

import type { FakeFiber } from './helpers/fakeFiber';
import { fiberChain } from './helpers/fakeFiber';

const FIBER_KEY = '__reactFiber$t1';
const PROPS_KEY = '__reactProps$t1';
const ROW_SELECTOR = '[data-key]';

/**
 * Шаг fiber от строки до компонента с `row` в живой Worker-версии — один; в стенде — три.
 */
const ROW_STEPS = 3;

const STICKER_NAME = '😀.amostk.k-sticker.gif';

/**
 * `style` строки: переменные и счёт записей.
 */
class FakeStyle {
  readonly vars = new Map<string, string>();

  writes = 0;

  getPropertyValue(name: string) {
    return this.vars.get(name) || '';
  }

  setProperty(name: string, value: string) {
    this.writes++;
    this.vars.set(name, value);
  }

  removeProperty(name: string) {
    this.writes++;
    this.vars.delete(name);

    return '';
  }
}

/**
 * Узел ленты: атрибуты, `style` и поиск по `[attr]` — ровно то, что читает пометка. Записи атрибутов считаются.
 */
class FakeFeedNode {
  readonly attributes = new Map<string, string>();

  readonly style = new FakeStyle();

  readonly children: FakeFeedNode[] = [];

  parent: FakeFeedNode | null = null;

  writes = 0;

  constructor(attrs: Record<string, string> = {}) {
    for (const [name, value] of Object.entries(attrs)) {
      this.attributes.set(name, value);
    }
  }

  /**
   * Записи атрибутов и переменных вместе.
   */
  get allWrites() {
    return this.writes + this.style.writes;
  }

  getAttribute(name: string) {
    const value = this.attributes.get(name);

    return value === undefined ? null : value;
  }

  setAttribute(name: string, value: string) {
    this.writes++;
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.writes++;
    this.attributes.delete(name);
  }

  append(...nodes: FakeFeedNode[]) {
    for (const node of nodes) {
      node.parent = this;
      this.children.push(node);
    }

    return this;
  }

  matches(selector: string) {
    return selector === ROW_SELECTOR && this.attributes.has('data-key');
  }

  closest(selector: string): FakeFeedNode | null {
    if (this.matches(selector)) return this;

    return this.parent ? this.parent.closest(selector) : null;
  }

  querySelectorAll(selector: string): FakeFeedNode[] {
    return this.children.flatMap((child) => {
      const found = child.querySelectorAll(selector);

      return child.matches(selector) ? [child, ...found] : found;
    });
  }
}

type RowFields = Record<string, unknown>;

/**
 * Данные строки ленты, как в пропсах страницы: стикер без подписи, адресата, пересылки и реакций.
 *
 * @param key — ключ строки
 * @param fields — поля поверх стикера
 * @returns `row`
 */
const rowData = (key: string, fields: RowFields = {}) => {
  return {
    key,
    media: { kind: 'photo', name: STICKER_NAME, w: 512, h: 256 },
    text: null,
    blocks: null,
    forwardedFrom: null,
    to: null,
    reactions: [],
    ...fields,
  };
};

/**
 * Строка `[data-key]` с fiber: компонент с `row` — в `steps` шагах `return` от fiber узла.
 *
 * @param key — ключ строки
 * @param fields — поля `row` поверх стикера
 * @param steps — шагов до компонента с `row`
 * @returns узел строки
 */
const rowNode = (key: string, fields: RowFields = {}, steps = ROW_STEPS) => {
  const node = new FakeFeedNode({ 'data-key': key });
  const { leaf } = fiberChain(steps, { row: rowData(key, fields), chat: 'chat-1' });

  Object.assign(node, { [FIBER_KEY]: leaf });

  return node;
};

/**
 * Коммит, как у React с двумя копиями дерева: `__reactFiber$` остаётся прежней копией, текущей
 * становится её `alternate` с новыми пропсами узла и новым путём к компоненту строки.
 *
 * @param node — строка
 * @param fields — поля `row` после коммита
 */
const commit = (node: FakeFeedNode, fields: RowFields) => {
  const key = node.getAttribute('data-key') || '';
  const stale: FakeFiber = Reflect.get(node, FIBER_KEY);
  const hostProps = { 'data-key': key };
  const { leaf } = fiberChain(ROW_STEPS - 1, {
    row: rowData(key, fields),
    chat: 'chat-1',
  });
  const current: FakeFiber = { return: leaf, alternate: stale, memoizedProps: hostProps };

  stale.alternate = current;
  Object.assign(node, { [PROPS_KEY]: hostProps });
};

const markOf = (node: FakeFeedNode) => {
  return {
    kind: node.getAttribute(MARK_KIND_ATTR),
    w: node.style.getPropertyValue(MARK_WIDTH_VAR),
    h: node.style.getPropertyValue(MARK_HEIGHT_VAR),
  };
};

const NO_MARK = { kind: null, w: '', h: '' };

describe('markRows', () => {
  it('стикер: вид и стороны, без имени файла', () => {
    const node = rowNode('k1');

    markRows([node]);

    expect(markOf(node)).toEqual({ kind: 'sticker', w: '512', h: '256' });
    expect([...node.attributes.keys()]).toEqual(['data-key', MARK_KIND_ATTR]);
    expect([...node.style.vars.keys()]).toEqual([MARK_WIDTH_VAR, MARK_HEIGHT_VAR]);
  });

  it('GIF из поиска и незнакомый вид — gif', () => {
    const gif = rowNode('k1', {
      media: { kind: 'photo', name: 'cat.amostk.k-gif.gif', w: 320, h: 240 },
    });
    const unknown = rowNode('k2', {
      media: { kind: 'photo', name: 'amostk.k-zzz.gif', w: 10, h: 20 },
    });

    markRows([gif, unknown]);

    expect(markOf(gif)).toEqual({ kind: 'gif', w: '320', h: '240' });
    expect(markOf(unknown)).toEqual({ kind: 'gif', w: '10', h: '20' });
  });

  it.each([
    ['чужая картинка', { media: { kind: 'photo', name: 'photo.jpg', w: 512, h: 512 } }],
    ['без маркера', { media: { kind: 'photo', name: 'sticker.gif', w: 512, h: 512 } }],
    ['пересылка', { forwardedFrom: 'Анна' }],
    ['подпись текстом', { text: 'привет' }],
    ['подпись с разметкой', { blocks: [{ kind: 'p' }] }],
    ['адресат', { to: { id: 'u1', name: 'Анна', kind: 'user' } }],
    ['адресат @all', { to: { id: '', name: '', kind: 'all' } }],
    ['реакция', { reactions: [{ emoji: '👍', count: 1 }] }],
    ['не фото', { media: { kind: 'video', name: STICKER_NAME, w: 512, h: 512 } }],
    ['без сторон', { media: { kind: 'photo', name: STICKER_NAME, w: 0, h: 512 } }],
    ['удалённое', { media: null }],
  ])('%s — без пометки и без записей', (_title, fields) => {
    const node = rowNode('k1', fields);

    markRows([node]);

    expect(markOf(node)).toEqual(NO_MARK);
    expect(node.allWrites).toBe(0);
  });

  it('row другой строки — без пометки', () => {
    const node = rowNode('k1');

    node.setAttribute('data-key', 'k2');
    node.writes = 0;
    markRows([node]);

    expect(markOf(node)).toEqual(NO_MARK);
  });

  it('row на 12-м шаге помечается, на 13-м — нет', () => {
    const near = rowNode('k1', {}, 12);
    const far = rowNode('k2', {}, 13);

    markRows([near, far]);

    expect(markOf(near).kind).toBe('sticker');
    expect(markOf(far)).toEqual(NO_MARK);
  });

  it('повторная пачка без изменений — ни одной записи', () => {
    const node = rowNode('k1');

    markRows([node]);
    const first = node.allWrites;

    markRows([node]);
    markRows([node]);

    expect(first).toBeGreaterThan(0);
    expect(node.allWrites).toBe(first);
  });

  it('снятие у строки, получившей реакцию, — по актуальной копии fiber', () => {
    const node = rowNode('k1');

    markRows([node]);
    commit(node, { reactions: [{ emoji: '👍', count: 1 }] });
    markRows([node]);

    expect(markOf(node)).toEqual(NO_MARK);
    expect([...node.attributes.keys()]).toEqual(['data-key']);
  });

  it('устаревшая копия fiber со стикером не помечает строку, ставшую чужой', () => {
    const node = rowNode('k1');

    commit(node, { media: { kind: 'photo', name: 'photo.jpg', w: 512, h: 512 } });
    markRows([node]);

    expect(markOf(node)).toEqual(NO_MARK);
  });

  it('устаревшая копия fiber без стикера не мешает пометить строку', () => {
    const node = rowNode('k1', { media: null });

    commit(node, {});
    markRows([node]);

    expect(markOf(node).kind).toBe('sticker');
  });

  it('смена сторон переписывает только переменные', () => {
    const node = rowNode('k1');

    markRows([node]);
    node.writes = 0;
    commit(node, { media: { kind: 'photo', name: STICKER_NAME, w: 128, h: 128 } });
    markRows([node]);

    expect(markOf(node)).toEqual({ kind: 'sticker', w: '128', h: '128' });
    expect(node.writes).toBe(0);
  });
});

describe('rowsOf', () => {
  it('добавленные строки, строки в добавленном узле и строка цели — каждая один раз', () => {
    const feed = new FakeFeedNode();
    const added = rowNode('k1');
    const nested = rowNode('k2');
    const wrapper = new FakeFeedNode().append(nested);
    const changed = rowNode('k3');
    const inner = new FakeFeedNode();

    changed.append(inner);
    feed.append(added, wrapper, changed);

    const records: FeedMutation[] = [
      { target: feed, addedNodes: [added, wrapper, { nodeType: 3 }] },
      { target: inner, addedNodes: [new FakeFeedNode()] },
      { target: inner, addedNodes: [] },
      { target: added, addedNodes: [] },
    ];

    expect([...rowsOf(records)]).toEqual([added, nested, changed]);
  });

  it('цель вне строки — ничего', () => {
    const feed = new FakeFeedNode();

    expect(rowsOf([{ target: feed, addedNodes: [] }]).size).toBe(0);
  });
});

/**
 * `MutationObserver` без DOM: запоминает, за чем и как следит, и отдаёт пачку по команде.
 */
class FakeObserver {
  static last: FakeObserver | null = null;

  readonly callback: (records: FeedMutation[]) => void;

  observed: [FakeFeedNode, MutationObserverInit] | null = null;

  constructor(callback: (records: FeedMutation[]) => void) {
    this.callback = callback;
    FakeObserver.last = this;
  }

  observe(target: FakeFeedNode, options: MutationObserverInit) {
    this.observed = [target, options];
  }
}

describe('watchFeedRows', () => {
  it('помечает уже стоящие строки и следит только за childList всего дерева', () => {
    const root = new FakeFeedNode();
    const existing = rowNode('k1');

    root.append(existing);
    watchFeedRows(root, FakeObserver);

    expect(markOf(existing).kind).toBe('sticker');
    expect(FakeObserver.last?.observed).toEqual([
      root,
      { childList: true, subtree: true },
    ]);
  });

  it('пачка мутаций помечает появившиеся строки', () => {
    const root = new FakeFeedNode();

    watchFeedRows(root, FakeObserver);
    const added = rowNode('k1');

    root.append(added);
    FakeObserver.last?.callback([{ target: root, addedNodes: [added] }]);

    expect(markOf(added).kind).toBe('sticker');
  });
});
