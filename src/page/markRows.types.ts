import type { StickerKind } from '@shared/stickerMark.types';

/**
 * Строка ленты `[data-key]`, как её помечает агент: атрибут вида на ней, переменные сторон — у её коробки медиа.
 */
export type FeedRowNode = {
  /**
   * Значение атрибута; null — атрибута нет.
   */
  getAttribute: (name: string) => string | null;

  /**
   * Запись атрибута.
   */
  setAttribute: (name: string, value: string) => void;

  /**
   * Снятие атрибута.
   */
  removeAttribute: (name: string) => void;

  /**
   * Первый потомок по селектору; null — нет: коробка медиа строки.
   */
  querySelector: (selector: string) => object | null;
};

/**
 * Коробка медиа строки: переменные сторон — в её inline-стиле.
 */
export type MediaBoxNode = {
  /**
   * Inline-стиль коробки.
   */
  readonly style: Pick<
    CSSStyleDeclaration,
    'getPropertyValue' | 'setProperty' | 'removeProperty'
  >;
};

/**
 * Элемент из пачки мутаций: строка ищется на нём, в нём и над ним. Узлы другой формы (текст, документ) пропускаются.
 */
export type FeedNode = {
  /**
   * Подходит ли сам узел под селектор.
   */
  matches: (selector: string) => boolean;

  /**
   * Ближайший предок по селектору, включая сам узел; null — нет.
   */
  closest: (selector: string) => object | null;

  /**
   * Потомки по селектору.
   */
  querySelectorAll: (selector: string) => Iterable<object>;
};

/**
 * Запись пачки `MutationObserver`, срез `MutationRecord`.
 */
export type FeedMutation = {
  /**
   * Узел, у которого сменились дети.
   */
  readonly target: object;

  /**
   * Добавленные узлы.
   */
  readonly addedNodes: Iterable<object>;
};

/**
 * Корень наблюдения: документ страницы.
 */
export type FeedRoot = {
  /**
   * Узлы документа по селектору: начальный проход по уже стоящим строкам.
   */
  querySelectorAll: (selector: string) => Iterable<object>;
};

/**
 * Конструктор `MutationObserver`, срез: колбэк пачки и `observe`.
 */
export type FeedObserverClass<Root extends FeedRoot> = new (
  callback: (records: FeedMutation[]) => void
) => {
  /**
   * Начало слежения за корнем.
   */
  observe: (target: Root, options: MutationObserverInit) => void;
};

/**
 * Пометка строки: вид и исходные стороны картинки.
 */
export type RowMark = {
  /**
   * Вид: `sticker` уменьшается до 208 px, `gif` остаётся в размере amo.
   */
  kind: StickerKind;

  /**
   * Ширина картинки, px, целое больше нуля.
   */
  w: number;

  /**
   * Высота картинки, px, целое больше нуля.
   */
  h: number;
};

/**
 * Пропсы компонента строки ленты: данные строки в `row`.
 */
export type RowProps = {
  /**
   * Данные строки; форма проверяется при чтении.
   */
  row: unknown;
};
