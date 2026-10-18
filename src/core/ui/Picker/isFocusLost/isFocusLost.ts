/**
 * Потерян ли фокус: он в `body` — ушёл туда вместе с удалённым из DOM элементом — или на элементе корня узла, который
 * стал недоступен (`disabled` снимает фокус не сразу). Фокус в поле ввода amo или на другом месте страницы потерянным
 * не считается: его у пользователя не забирают.
 *
 * @param node — узел в корне, где ищется фокус: shadow root пикера или документ
 * @returns `true` — фокуса нет, и его можно поставить
 */
export const isFocusLost = (node: Node): boolean => {
  const { ownerDocument } = node;

  if (!ownerDocument) return false;

  const { activeElement, body } = ownerDocument;

  if (!activeElement || activeElement === body) return true;

  const root = node.getRootNode();
  const focused = root instanceof ShadowRoot ? root.activeElement : activeElement;

  return Boolean(focused?.matches(':disabled'));
};
