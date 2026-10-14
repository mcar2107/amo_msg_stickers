import { FakeElement } from './fakeDocument';

const ATTR_SELECTOR_RE = /^\[([\w-]+)\]$/;

/**
 * Узел DOM для агента Worker-версии: дерево (`parentElement`, `children`), текст, поиск потомков и события. Поиск
 * понимает только `[attr]` и имя тега — ровно то, чем агент ищет капсулу, вложения и кнопки ленты. Свойства fiber
 * задаются через `extra`, как у `FakeElement`.
 */
export class FakePageNode extends FakeElement {
  parentElement: FakePageNode | null = null;

  readonly children: FakePageNode[] = [];

  readonly tag: string;

  readonly dispatched: Event[] = [];

  /**
   * Обработчик события на узле — как слушатель страницы.
   */
  onDispatch: ((event: Event) => void) | null = null;

  /**
   * Текст узла; задаётся после создания, а не через `extra`: поле подкласса перезаписало бы его.
   */
  textContent = '';

  constructor(tag: string, attrs: Record<string, string> = {}, extra: object = {}) {
    super(extra);
    this.tag = tag;

    for (const [name, value] of Object.entries(attrs)) {
      this.setAttribute(name, value);
    }
  }

  /**
   * @param nodes — дети по порядку
   * @returns сам узел — для сборки дерева одним выражением
   */
  append(...nodes: FakePageNode[]) {
    for (const node of nodes) {
      node.parentElement = this;
      this.children.push(node);
    }

    return this;
  }

  matches(selector: string) {
    const [, name] = selector.match(ATTR_SELECTOR_RE) || [];

    return name ? this.getAttribute(name) !== null : this.tag === selector;
  }

  querySelectorAll(selector: string): FakePageNode[] {
    return this.children.flatMap((child) => {
      const found = child.querySelectorAll(selector);

      return child.matches(selector) ? [child, ...found] : found;
    });
  }

  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] || null;
  }

  dispatchEvent(event: Event) {
    this.dispatched.push(event);
    this.onDispatch?.(event);

    return true;
  }
}
