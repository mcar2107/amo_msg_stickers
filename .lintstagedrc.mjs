/**
 * Ключи не перекрываются: lint-staged запускает их параллельно, а `ast-grep scan` должен читать
 * файл после правки — поэтому он идёт в том же массиве за редактирующей командой.
 */
export default {
  '*.{ts,tsx,mjs}': ['eslint --fix', 'mise x -- ast-grep scan'],
  '*.{js,cjs,cts,mts,jsx}': 'eslint --fix',
  '*.css': ['prettier --write', 'mise x -- ast-grep scan'],
  '*.{json,yml,yaml,html}': 'prettier --write',
};
