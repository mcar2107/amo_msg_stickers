import type {
  FieldDescriptionIds,
  FieldDescriptionParts,
} from './fieldDescription.types';

/**
 * id узлов описания выводятся из id поля: в закрытом shadow root пикера id поля уникален, и
 * описания уникальны вместе с ним.
 *
 * @param id — id поля
 * @returns id ошибки, результата проверки и подсказки
 */
export const fieldDescriptionIds = (id: string): FieldDescriptionIds => {
  return { error: `${id}-error`, result: `${id}-result`, hint: `${id}-hint` };
};

/**
 * Описание поля — в порядке показа под ним: скринридер читает ошибку раньше подсказки, как
 * её видит глаз. Ссылка на непоказанный узел не пишется: скринридер её пропустил бы, но
 * проверка доступности считает битой.
 *
 * @param id — id поля
 * @param parts — какие описания показаны и внешние описания
 * @returns значение `aria-describedby`; пустая строка — описания нет
 */
export const fieldDescribedBy = (id: string, parts: FieldDescriptionParts): string => {
  const { hasError, hasResult, hasHint, describedBy } = parts;
  const { error, result, hint } = fieldDescriptionIds(id);
  const ids: string[] = [];

  if (hasError) ids.push(error);
  if (hasResult) ids.push(result);
  if (hasHint) ids.push(hint);
  if (describedBy) ids.push(describedBy);

  return ids.join(' ');
};
