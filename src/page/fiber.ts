import { fieldOf } from './field';

/**
 * Пропсы компонентов React страницы — от DOM-узла по fiber. Это внутренности React, а не API: форма значений
 * проверяется на каждом шаге вызывающей стороной.
 */

export const FIBER_KEY_PREFIX = '__reactFiber$';
const PROPS_KEY_PREFIX = '__reactProps$';

const valueByPrefix = (node: object, prefix: string): unknown => {
  const key = Object.keys(node).find((name) => {
    return name.startsWith(prefix);
  });

  return key ? Reflect.get(node, key) : null;
};

/**
 * Актуальная копия fiber узла. `__reactFiber$` остаётся копией, с которой узел создан, а текущей после коммитов
 * становится то она, то её `alternate` — та, чьи `memoizedProps` равны `__reactProps$` узла. Устаревшая копия
 * держит прежние пропсы и прежний путь к компонентам выше.
 *
 * @param node — DOM-узел страницы
 * @returns fiber; null — узел не из React
 */
const currentFiberOf = (node: object): unknown => {
  const fiber = valueByPrefix(node, FIBER_KEY_PREFIX);
  const alternate = fieldOf(fiber, 'alternate');
  const props = valueByPrefix(node, PROPS_KEY_PREFIX);

  return props && fieldOf(alternate, 'memoizedProps') === props ? alternate : fiber;
};

/**
 * Пропсы ближайшего компонента выше узла, подходящие по форме.
 *
 * @param node — DOM-узел страницы
 * @param maxSteps — сколько шагов `return` пройти от fiber узла: предел — страховка от чужого компонента выше
 * @param isMatch — гард формы пропсов
 * @returns пропсы; null — в пределах шагов таких нет
 */
export const propsUp = <T>(
  node: object,
  maxSteps: number,
  isMatch: (props: unknown) => props is T
): T | null => {
  let fiber = currentFiberOf(node);

  for (let step = 0; fiber && step <= maxSteps; step++) {
    const props = fieldOf(fiber, 'memoizedProps');

    if (isMatch(props)) return props;

    fiber = fieldOf(fiber, 'return');
  }

  return null;
};
