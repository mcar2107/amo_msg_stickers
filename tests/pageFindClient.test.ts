import { describe, expect, it } from 'vitest';

import { findClient } from '@page/findClient';

import { fiberChain, nodeWithFiber } from './helpers';

const makeClient = () => {
  return {
    sendRequest: async () => {
      return undefined;
    },
    reduxStore: {
      getState: () => {
        return {};
      },
    },
  };
};

describe('findClient', () => {
  it('находит провайдер на глубине 40 от поля ввода', () => {
    const client = makeClient();
    const { leaf } = fiberChain(40, { value: client });

    expect(findClient(nodeWithFiber(leaf))).toBe(client);
  });

  it('находит значение только на копии fiber (alternate)', () => {
    const client = makeClient();
    const { leaf, target } = fiberChain(3, { value: 'устаревшее' });

    target.alternate = {
      return: null,
      alternate: target,
      memoizedProps: { value: client },
    };

    expect(findClient(nodeWithFiber(leaf))).toBe(client);
  });

  it('берёт ближайший провайдер amo, пропуская чужие контексты', () => {
    const client = makeClient();
    const { leaf, target } = fiberChain(5, { value: client });

    target.return = {
      return: null,
      alternate: null,
      memoizedProps: { value: makeClient() },
    };
    leaf.memoizedProps = { value: { theme: 'dark' } };

    expect(findClient(nodeWithFiber(leaf))).toBe(client);
  });

  it('null, если у узла нет ключа fiber', () => {
    expect(findClient({ className: 'editable' })).toBeNull();
  });

  it('null, если провайдера на пути к корню нет', () => {
    const { leaf } = fiberChain(10, { value: { theme: 'dark' } });

    expect(findClient(nodeWithFiber(leaf))).toBeNull();
  });

  it('null, если у значения нет reduxStore.getState', () => {
    const { leaf } = fiberChain(2, {
      value: {
        sendRequest: () => {
          return null;
        },
        reduxStore: {},
      },
    });

    expect(findClient(nodeWithFiber(leaf))).toBeNull();
  });

  it('не зацикливается на петле .return', () => {
    const { leaf } = fiberChain(2, { value: null });

    leaf.return = leaf;

    expect(findClient(nodeWithFiber(leaf))).toBeNull();
  });

  it('не идёт дальше 200 шагов', () => {
    const { leaf } = fiberChain(250, { value: makeClient() });

    expect(findClient(nodeWithFiber(leaf))).toBeNull();
  });
});
