import type { AmoClient } from './amo.types';
import { fiberOf } from './fiber';
import { fieldOf } from './field';

/**
 * `sendRequest` и `reduxStore` amo — одно значение React-контекста выше поля ввода по
 * дереву React. Добираемся до него от DOM-узла по fiber: это внутренности React, а
 * не API, поэтому форма значения проверяется на каждом шаге, а не принимается на веру.
 */

/**
 * Провайдер лежит в десятках узлов от поля ввода (в живом amo — 40); предел — страховка от
 * зацикливания на неожиданной структуре.
 */
const MAX_FIBER_DEPTH = 200;

const isAmoClient = (value: unknown): value is AmoClient => {
  const store = fieldOf(value, 'reduxStore');

  return (
    typeof fieldOf(value, 'sendRequest') === 'function' &&
    typeof fieldOf(store, 'getState') === 'function'
  );
};

/**
 * Значение провайдера ищется и у копии fiber (`alternate`): ссылка `__reactFiber$` на
 * DOM-узле может вести в устаревшую копию дерева, а свежие `memoizedProps` лежат у второй.
 *
 * @param node — DOM-узел внутри дерева React amo, обычно поле ввода
 * @returns `{ reduxStore, sendRequest }` amo; null — узел не из React или провайдера нет
 */
export const findClient = (node: object): AmoClient | null => {
  let fiber = fiberOf(node);

  for (let depth = 0; fiber && depth < MAX_FIBER_DEPTH; depth++) {
    for (const copy of [fiber, fieldOf(fiber, 'alternate')]) {
      const value = fieldOf(fieldOf(copy, 'memoizedProps'), 'value');

      if (isAmoClient(value)) return value;
    }

    fiber = fieldOf(fiber, 'return');
  }

  return null;
};
