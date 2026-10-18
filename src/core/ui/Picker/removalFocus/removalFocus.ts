import type { FocusSection, FocusTarget } from './removalFocus.types';

/**
 * Вкладки соседних разделов: сначала следующего — он встаёт на место удалённого, — затем
 * предыдущего.
 *
 * @param sections — разделы ленты до удаления
 * @param index — место раздела в ленте
 * @returns вкладки соседей, которые есть в ленте
 */
const neighbourTabs = (
  sections: readonly FocusSection[],
  index: number
): FocusTarget[] => {
  return [sections[index + 1], sections[index - 1]].reduce<FocusTarget[]>(
    (targets, neighbour) => {
      if (neighbour) targets.push({ kind: 'tab', sectionId: neighbour.id });

      return targets;
    },
    []
  );
};

/**
 * Цели фокуса после удаления ячейки, по убыванию предпочтения: соседняя ячейка раздела
 * (следующая, иначе предыдущая) — клавиатура продолжает с того же места ленты; вкладка
 * раздела, если он опустел; вкладки соседних разделов, если раздел исчез целиком.
 *
 * Цели считаются по ленте до удаления: после неё ячейки уже нет, и соседей не найти.
 *
 * @param sections — разделы ленты до удаления
 * @param sectionId — раздел удаляемой ячейки
 * @param key — ключ удаляемой ячейки
 * @returns цели фокуса; пусто — ячейки в ленте нет
 */
export const cellRemovalTargets = (
  sections: readonly FocusSection[],
  sectionId: string,
  key: string
): FocusTarget[] => {
  const index = sections.findIndex(({ id }) => {
    return id === sectionId;
  });
  const section = sections[index];

  if (!section) return [];

  const position = section.items.findIndex((item) => {
    return item.key === key;
  });

  if (position < 0) return [];

  const cells = [section.items[position + 1], section.items[position - 1]].reduce<
    FocusTarget[]
  >((targets, item) => {
    if (item) targets.push({ kind: 'cell', sectionId, key: item.key });

    return targets;
  }, []);

  return [...cells, { kind: 'tab', sectionId }, ...neighbourTabs(sections, index)];
};

/**
 * Цели фокуса после правки избранного из меню ячейки. Цель ставится на каждую правку, а не только на уход
 * ячейки: ряды ленты ключуются номером, и раздел «Избранное», выросший, появившийся или исчезнувший выше,
 * пересоздаёт кнопку оставшейся ячейки — фокус, возвращённый меню на источник, упал бы в `body`.
 *
 * @param sections — разделы ленты до правки
 * @param sectionId — раздел ячейки
 * @param key — ключ ячейки
 * @param isLeaving — ячейка уходит из раздела: убрана из избранного или добавлена туда из недавних
 * @returns цели фокуса: та же ячейка, если она остаётся, иначе — как после удаления ячейки
 */
export const favoriteToggleTargets = (
  sections: readonly FocusSection[],
  sectionId: string,
  key: string,
  isLeaving: boolean
): FocusTarget[] => {
  if (isLeaving) return cellRemovalTargets(sections, sectionId, key);

  return [{ kind: 'cell', sectionId, key }];
};

/**
 * Цели фокуса после удаления раздела целиком: вкладка соседнего раздела.
 *
 * @param sections — разделы ленты до удаления
 * @param sectionId — удаляемый раздел
 * @returns цели фокуса; пусто — раздела в ленте нет
 */
export const sectionRemovalTargets = (
  sections: readonly FocusSection[],
  sectionId: string
): FocusTarget[] => {
  const index = sections.findIndex(({ id }) => {
    return id === sectionId;
  });

  if (index < 0) return [];

  return neighbourTabs(sections, index);
};

/**
 * Первая цель, которая осталась в ленте после удаления.
 *
 * @param targets — цели по убыванию предпочтения
 * @param sections — разделы ленты после удаления
 * @returns цель фокуса; `null` — ни одной не осталось
 */
export const resolveFocusTarget = (
  targets: readonly FocusTarget[],
  sections: readonly FocusSection[]
): FocusTarget | null => {
  const byId = new Map<string, FocusSection>();

  for (const section of sections) byId.set(section.id, section);

  return (
    targets.find((target) => {
      const section = byId.get(target.sectionId);

      if (!section) return false;

      switch (target.kind) {
        case 'tab': {
          return true;
        }

        case 'cell': {
          return section.items.some(({ key }) => {
            return key === target.key;
          });
        }

        default: {
          const unknownTarget: never = target;

          throw new Error(`Unknown focus target: ${String(unknownTarget)}`);
        }
      }
    }) || null
  );
};
