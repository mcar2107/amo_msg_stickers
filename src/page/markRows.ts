import { isDimension } from '@shared/guards';
import {
  MARK_BOX_SELECTOR,
  MARK_HEIGHT_VAR,
  MARK_KIND_ATTR,
  MARK_WIDTH_VAR,
  markKindOf,
} from '@shared/stickerMark';

import { propsUp } from './fiber';
import { fieldOf } from './field';
import type {
  FeedMutation,
  FeedNode,
  FeedObserverClass,
  FeedRoot,
  FeedRowNode,
  MediaBoxNode,
  RowMark,
  RowProps,
} from './markRows.types';

/**
 * Пометка строк ленты Worker-версии amo web (design.md, решение 7): имени файла в DOM этой версии нет, а стилю нужен
 * вид своего сообщения и стороны картинки до её загрузки. Агент читает их из данных строки в пропсах страницы и
 * ставит на строку атрибут вида, а на её коробку медиа — переменные сторон; имя файла в DOM не пишется.
 */

const ROW_KEY_ATTR = 'data-key';
const ROW_SELECTOR = `[${ROW_KEY_ATTR}]`;

/**
 * Компонент строки в живой Worker-версии — в шаге fiber от узла строки; предел — с запасом на обёртки.
 */
const ROW_MAX_STEPS = 12;

const PHOTO_KIND = 'photo';

/**
 * Слежение — только за детьми: набор текста, время и анимации на `transform` / `opacity` наблюдатель почти не будят,
 * а свои записи атрибутов и `style` не вызывают новой пачки.
 */
const OBSERVE_OPTIONS: MutationObserverInit = { childList: true, subtree: true };

const isFeedRow = (node: object): node is FeedRowNode => {
  return (
    'querySelector' in node &&
    'getAttribute' in node &&
    'setAttribute' in node &&
    'removeAttribute' in node
  );
};

const isMediaBox = (node: object | null): node is MediaBoxNode => {
  return node !== null && 'style' in node;
};

const isFeedNode = (node: object): node is FeedNode => {
  return 'matches' in node && 'closest' in node && 'querySelectorAll' in node;
};

const isFilled = (value: unknown) => {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
};

/**
 * Данные строки — у компонента выше узла, чей `row.key` совпадает с `data-key`: `__reactFiber$` узла может вести в
 * устаревшую копию дерева, поэтому подъём идёт от актуальной.
 *
 * @param node — строка ленты
 * @returns `row`; null — строка не из ленты Worker-версии
 */
const rowDataOf = (node: FeedRowNode) => {
  const key = node.getAttribute(ROW_KEY_ATTR);

  if (!key) return null;

  const props = propsUp(node, ROW_MAX_STEPS, (value): value is RowProps => {
    return fieldOf(fieldOf(value, 'row'), 'key') === key;
  });

  return props ? props.row : null;
};

/**
 * Стикером показывается только фото с маркером в имени, без пересылки, подписи, адресата «@Имя» и реакций: у
 * остальных сообщений amo держит пузырь, и стиль их не трогает.
 *
 * @param node — строка ленты
 * @returns пометка; null — строка не своя или её нельзя показать стикером
 */
const rowMarkOf = (node: FeedRowNode): RowMark | null => {
  const row = rowDataOf(node);
  const media = fieldOf(row, 'media');
  const name = fieldOf(media, 'name');
  const w = fieldOf(media, 'w');
  const h = fieldOf(media, 'h');

  if (
    fieldOf(media, 'kind') !== PHOTO_KIND ||
    typeof name !== 'string' ||
    !isDimension(w) ||
    !isDimension(h) ||
    isFilled(fieldOf(row, 'forwardedFrom')) ||
    isFilled(fieldOf(row, 'text')) ||
    isFilled(fieldOf(row, 'blocks')) ||
    isFilled(fieldOf(row, 'to')) ||
    isFilled(fieldOf(row, 'reactions'))
  ) {
    return null;
  }

  const kind = markKindOf(name);

  return kind ? { kind, w, h } : null;
};

/**
 * Запись только при смене значения: лишняя запись пересчитала бы стиль строки.
 *
 * @param node — строка ленты
 * @param value — вид; null — атрибут снимается
 */
const syncKind = (node: FeedRowNode, value: string | null) => {
  if (node.getAttribute(MARK_KIND_ATTR) === value) return;

  if (value === null) {
    node.removeAttribute(MARK_KIND_ATTR);
  } else {
    node.setAttribute(MARK_KIND_ATTR, value);
  }
};

/**
 * @param box — коробка медиа строки
 * @param name — переменная стороны
 * @param value — значение без единиц; пустая строка — переменная снимается
 */
const syncVar = (box: MediaBoxNode, name: string, value: string) => {
  const { style } = box;

  if (style.getPropertyValue(name) === value) return;

  if (value) {
    style.setProperty(name, value);
  } else {
    style.removeProperty(name);
  }
};

/**
 * Ставит пометку строкам, которые можно показать стикером, и снимает её у остальных — в том числе у строки, ставшей
 * чужой: сообщение удалено, заменено или получило реакцию.
 *
 * Коробку медиа лента может смонтировать позже строки или пересоздать: смена детей внутри строки снова приводит её
 * сюда (`rowsOf`), и стороны встают на новую коробку той же пачкой, до её первой отрисовки.
 *
 * @param nodes — строки ленты
 */
export const markRows = (nodes: Iterable<FeedRowNode>) => {
  for (const node of nodes) {
    const mark = rowMarkOf(node);

    /**
     * Строка без метки и без атрибута вида переменных сторон на коробке не несёт: их ставят только вместе с
     * атрибутом. Поиск коробки пропускается — чужих строк в пачке большинство.
     */
    if (!mark && node.getAttribute(MARK_KIND_ATTR) === null) continue;

    const box = node.querySelector(MARK_BOX_SELECTOR);

    if (isMediaBox(box)) {
      syncVar(box, MARK_WIDTH_VAR, mark ? String(mark.w) : '');
      syncVar(box, MARK_HEIGHT_VAR, mark ? String(mark.h) : '');
    }

    syncKind(node, mark ? mark.kind : null);
  }
};

/**
 * Строки, которых касается пачка мутаций: добавленные, лежащие в добавленных узлах и та, внутри которой сменились
 * дети. Каждая строка — один раз на пачку.
 *
 * @param records — пачка мутаций
 * @returns строки ленты
 */
export const rowsOf = (records: Iterable<FeedMutation>) => {
  const rows = new Set<FeedRowNode>();

  const add = (node: object | null) => {
    if (node && isFeedRow(node)) rows.add(node);
  };

  for (const { target, addedNodes } of records) {
    for (const node of addedNodes) {
      if (!isFeedNode(node)) continue;

      if (node.matches(ROW_SELECTOR)) add(node);

      for (const row of node.querySelectorAll(ROW_SELECTOR)) add(row);
    }

    if (isFeedNode(target)) add(target.closest(ROW_SELECTOR));
  }

  return rows;
};

/**
 * Следит за лентой с корня документа: агент стартует до страницы, когда ни ленты, ни `body` ещё нет, и до того, как
 * React смонтирует строки. Колбэк пачки — микрозадача после коммита, до раскладки и замера строки лентой, поэтому
 * строка уже помечена, когда её впервые видно. Начальный проход помечает строки, вставшие до запуска агента.
 *
 * @param root — документ страницы
 * @param Observer — конструктор `MutationObserver` страницы
 */
export const watchFeedRows = <Root extends FeedRoot>(
  root: Root,
  Observer: FeedObserverClass<Root>
) => {
  const observer = new Observer((records) => {
    markRows(rowsOf(records));
  });

  observer.observe(root, OBSERVE_OPTIONS);
  markRows(
    [...root.querySelectorAll(ROW_SELECTOR)].reduce<FeedRowNode[]>((acc, node) => {
      if (isFeedRow(node)) acc.push(node);

      return acc;
    }, [])
  );
};
