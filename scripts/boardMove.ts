/**
 * Логика перевода карточки доски в In progress по созданию ветки. Только стираемый синтаксис
 * TS и без рантайм-импортов (`import type` Node удаляет целиком): `scripts/move-issue-in-progress.mjs`
 * импортирует модуль напрямую, а Node снимает типы сам, без сборки.
 */

import type { BoardMove, BoardTarget, ProjectItemNode } from './boardMove.types';

/**
 * Имя ветки задачи — `<type>/<номер issue>-<имя>`, как в `task-workflow`. Ветка релиза
 * (`release/<версия>`) номера не несёт и под шаблон не попадает.
 */
const BRANCH_PATTERN = /^(?:feature|fix|chore|docs)\/(\d+)-/;

const IN_PROGRESS = 'In progress';

/**
 * Статусы, из которых создание ветки двигает карточку. In review и Done — дальше In progress
 * по пути задачи: ветка, созданная позже (например, под правку после ревью), их не откатывает.
 */
const MOVABLE_FROM = new Set(['Backlog', 'Ready']);

/**
 * Номер issue из имени ветки.
 *
 * @param branch — короткое имя ветки без `refs/heads/`
 * @returns номер issue; `null` — имя не по шаблону задачи
 */
export const parseBranchIssue = (branch: string): number | null => {
  const match = BRANCH_PATTERN.exec(branch);

  if (!match) {
    return null;
  }

  return Number(match[1]);
};

/**
 * Что записать в доску, чтобы карточка issue стала In progress.
 *
 * @param nodes — карточки issue на всех досках, где она есть
 * @param target — доска, которую ведёт скрипт
 * @returns параметры мутации; `null` — двигать нечего: issue не на этой доске, карточка уже
 * дальше Backlog и Ready или у доски нет статуса In progress
 */
export const planMove = (
  nodes: ProjectItemNode[],
  target: BoardTarget
): BoardMove | null => {
  const node = nodes.find(({ project }) => {
    return project.number === target.number && project.owner.login === target.owner;
  });

  if (!node) {
    return null;
  }

  const statusName = node.status?.name;

  if (statusName && !MOVABLE_FROM.has(statusName)) {
    return null;
  }

  const fieldId = node.project.field?.id;
  const option = node.project.field?.options?.find(({ name }) => {
    return name === IN_PROGRESS;
  });

  if (!fieldId || !option) {
    return null;
  }

  return { projectId: node.project.id, itemId: node.id, fieldId, optionId: option.id };
};
