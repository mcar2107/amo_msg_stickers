/**
 * Элемент по id в корне узла — shadow root пикера или документе: `document.getElementById`
 * внутрь closed shadow root не заглядывает, поэтому ищется от корня самого узла.
 *
 * @param node — узел в том же корне, что и искомый элемент
 * @param id — id элемента
 * @returns элемент; `null` — его нет или узел вне документа
 */
export const elementById = (node: Node, id: string): HTMLElement | null => {
  const root = node.getRootNode();

  if (!(root instanceof DocumentFragment || root instanceof Document)) return null;

  return root.getElementById(id);
};
