export default {
  '*.{js,cjs,mjs,cts,mts,jsx,ts,tsx}': 'eslint --fix',
  '*.{css,json,yml,yaml,html}': 'prettier --write',
  /**
   * Правила проекта из sgconfig.yml только проверяют: автофикса у них нет.
   */
  '*.{ts,tsx,css}': 'mise x -- ast-grep scan',
};
