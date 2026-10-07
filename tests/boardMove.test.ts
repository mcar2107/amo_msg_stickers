import { describe, expect, it } from 'vitest';

import { parseBranchIssue, planMove } from '../scripts/boardMove';
import type { BoardTarget, ProjectItemNode } from '../scripts/boardMove.types';

const TARGET: BoardTarget = { owner: 'mcar2107', number: 1 };

const OPTIONS = [
  { id: 'o-backlog', name: 'Backlog' },
  { id: 'o-ready', name: 'Ready' },
  { id: 'o-progress', name: 'In progress' },
  { id: 'o-done', name: 'Done' },
];

/**
 * Карточка на доске `TARGET` со статусом `status`; `null` — статуса у карточки нет.
 *
 * @param status — название статуса карточки
 * @param project — правки доски поверх `TARGET`
 * @returns карточка в форме ответа GraphQL
 */
const makeNode = (
  status: string | null,
  project: Partial<ProjectItemNode['project']> = {}
): ProjectItemNode => {
  return {
    id: 'item-1',
    project: {
      id: 'project-1',
      number: TARGET.number,
      owner: { login: TARGET.owner },
      field: { id: 'field-status', options: OPTIONS },
      ...project,
    },
    status: status ? { name: status } : null,
  };
};

describe('parseBranchIssue', () => {
  it.each([
    ['feature/91-screens-ux', 91],
    ['fix/85-gif-attribution-visible', 85],
    ['chore/97-board-in-progress-on-branch', 97],
    ['docs/80-site-verification', 80],
  ])('берёт номер issue из «%s»', (branch, issue) => {
    expect(parseBranchIssue(branch)).toBe(issue);
  });

  it.each([
    'master',
    'release/0.19.0',
    'mcar2107-patch-1',
    'feature/screens-ux',
    'feature/91',
    'feature/91screens',
    'hotfix/91-screens',
    'x/feature/91-screens',
    '',
  ])('отклоняет «%s»', (branch) => {
    expect(parseBranchIssue(branch)).toBeNull();
  });
});

describe('planMove', () => {
  it.each(['Backlog', 'Ready'])('двигает карточку из «%s» в In progress', (status) => {
    expect(planMove([makeNode(status)], TARGET)).toEqual({
      projectId: 'project-1',
      itemId: 'item-1',
      fieldId: 'field-status',
      optionId: 'o-progress',
    });
  });

  it('двигает карточку без статуса', () => {
    expect(planMove([makeNode(null)], TARGET)).toMatchObject({ optionId: 'o-progress' });
  });

  it.each(['In progress', 'In review', 'Done'])(
    'не трогает карточку в «%s»',
    (status) => {
      expect(planMove([makeNode(status)], TARGET)).toBeNull();
    }
  );

  it('выбирает карточку нужной доски среди чужих', () => {
    const other = makeNode('Backlog', { id: 'project-2', number: 2 });
    const foreign = makeNode('Backlog', { id: 'project-3', owner: { login: 'someone' } });
    const own = makeNode('Backlog');

    expect(planMove([other, foreign, own], TARGET)).toMatchObject({
      projectId: 'project-1',
    });
  });

  it('ничего не делает, если issue не на доске', () => {
    expect(planMove([], TARGET)).toBeNull();
    expect(planMove([makeNode('Backlog', { number: 2 })], TARGET)).toBeNull();
  });

  it('ничего не делает, если у доски нет статуса In progress или поля Status', () => {
    const withoutOption = { id: 'field-status', options: OPTIONS.slice(0, 2) };

    expect(planMove([makeNode('Backlog', { field: withoutOption })], TARGET)).toBeNull();
    expect(planMove([makeNode('Backlog', { field: {} })], TARGET)).toBeNull();
    expect(planMove([makeNode('Backlog', { field: null })], TARGET)).toBeNull();
  });
});
