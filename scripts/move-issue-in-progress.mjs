/**
 * Переводит карточку issue на доске в In progress, когда создана ветка задачи
 * (`<type>/<номер issue>-<имя>`): встроенные workflows доски ставят этот статус только по
 * привязанному PR, а между веткой и PR карточка стояла бы в Backlog.
 *
 * Сбой доски — отсутствие токена, ответ GitHub с ошибкой — прогон не валит: создание ветки
 * от него не зависит, а причина остаётся предупреждением (`::warning::`) в логе.
 *
 * Запуск: `node scripts/move-issue-in-progress.mjs`. Окружение: `BRANCH` — короткое имя ветки,
 * `GITHUB_REPOSITORY` — `владелец/репозиторий`, `GH_TOKEN` — токен со scope `project`
 * (токен прогона управлять досками пользователя не может), `BOARD_OWNER` и `BOARD_NUMBER` —
 * доска.
 */
import { execFileSync } from 'node:child_process';

import { parseBranchIssue, planMove } from './boardMove.ts';

const ISSUE_ITEMS_QUERY = `
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      projectItems(first: 20) {
        nodes {
          id
          project {
            id
            number
            owner {
              ... on User { login }
              ... on Organization { login }
            }
            field(name: "Status") {
              ... on ProjectV2SingleSelectField { id options { id name } }
            }
          }
          status: fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
        }
      }
    }
  }
}`;

const MOVE_MUTATION = `
mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: $project
      itemId: $item
      fieldId: $field
      value: { singleSelectOptionId: $option }
    }
  ) {
    projectV2Item { id }
  }
}`;

/**
 * Запрос GraphQL через `gh`: токен и адрес API он берёт из окружения.
 *
 * @param query — текст запроса или мутации
 * @param variables — переменные; число уходит как `-F`, остальное — как `-f`
 * @returns поле `data` ответа
 */
const graphql = (query, variables) => {
  const args = Object.entries(variables).flatMap(([name, value]) => {
    return [typeof value === 'number' ? '-F' : '-f', `${name}=${value}`];
  });
  const output = execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return JSON.parse(output).data;
};

const { BRANCH, GITHUB_REPOSITORY, GH_TOKEN, BOARD_OWNER, BOARD_NUMBER } = process.env;
const issue = parseBranchIssue(BRANCH || '');

if (!issue) {
  console.info(`Ветка «${BRANCH}» не по шаблону задачи: доска не трогается`);
} else if (!GH_TOKEN) {
  console.warn(
    '::warning::Нет секрета PROJECT_TOKEN: карточка не переведена в In progress'
  );
} else {
  try {
    const [owner, repo] = GITHUB_REPOSITORY.split('/');
    const data = graphql(ISSUE_ITEMS_QUERY, { owner, repo, number: issue });
    const nodes = data.repository.issue?.projectItems.nodes || [];
    const move = planMove(nodes, { owner: BOARD_OWNER, number: Number(BOARD_NUMBER) });

    if (move) {
      graphql(MOVE_MUTATION, {
        project: move.projectId,
        item: move.itemId,
        field: move.fieldId,
        option: move.optionId,
      });
      console.info(`Issue #${issue}: карточка переведена в In progress`);
    } else {
      console.info(`Issue #${issue}: карточку двигать не нужно`);
    }
  } catch (error) {
    // Причина — в stderr `gh`; в `message` лежит только текст команды.
    const reason = String(error.stderr || error.message)
      .trim()
      .split('\n')[0];

    console.warn(`::warning::Доска не обновлена: ${reason}`);
  }
}
