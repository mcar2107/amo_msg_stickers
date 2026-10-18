import { gifKey } from '../../MasonryGrid/gifCellId';
import type { GifSection } from '../../MasonryGrid/MasonryGrid.types';
import {
  favoriteToggleTargets,
  resolveFocusTarget,
} from '../../removalFocus/removalFocus';
import type { FocusSection, FocusTarget } from '../../removalFocus/removalFocus.types';
import {
  FAVORITE_GIF_SECTION_ID,
  RECENT_GIF_SECTION_ID,
} from '../gifSections/gifSections';

import type { GifFocusCell } from './useGifRemovalFocus.types';

/**
 * Раздел, на первую GIF которого уходит фокус, когда раздел ячейки опустел: избранное и недавние
 * сменяют друг друга — GIF уходит из одного в другой. Выдача в этот выбор не входит: фокус,
 * провалившийся в тренды, увёл бы клавиатуру из хранимых GIF в чужую ленту.
 */
const PAIRED_SECTION: Partial<Record<string, string>> = {
  [FAVORITE_GIF_SECTION_ID]: RECENT_GIF_SECTION_ID,
  [RECENT_GIF_SECTION_ID]: FAVORITE_GIF_SECTION_ID,
};

/**
 * Разделы ленты GIF для выбора фокуса — все показанные, включая выдачу: иначе цель «та же
 * ячейка» трендов или поиска не нашлась бы.
 *
 * @param sections — разделы ленты сверху вниз
 * @returns разделы с ключами ячеек
 */
export const gifFocusSections = (sections: readonly GifSection[]): FocusSection[] => {
  return sections.map(({ id, items }) => {
    return {
      id,
      items: items.map((gif) => {
        return { key: gifKey(gif) };
      }),
    };
  });
};

/**
 * Цели фокуса после правки ячейки GIF — пункта избранного или «Убрать из недавних». Ячейка
 * выдачи остаётся на месте, и цель — она сама. Ячейка избранного и недавних уходит из раздела:
 * цели — соседняя ячейка раздела (следующая, иначе предыдущая), затем первая GIF парного раздела.
 *
 * У ленты GIF вкладок нет, и цель вида `tab` здесь значит «первая GIF раздела»: она считается по
 * ленте после правки, где GIF, переехавшая в парный раздел, уже стоит первой.
 *
 * @param sections — разделы ленты до правки
 * @param sectionId — раздел ячейки
 * @param key — ключ ячейки (`gifKey`)
 * @returns цели по убыванию предпочтения
 */
export const gifCellTargets = (
  sections: readonly FocusSection[],
  sectionId: string,
  key: string
): FocusTarget[] => {
  const paired = PAIRED_SECTION[sectionId];

  if (!paired) return favoriteToggleTargets(sections, sectionId, key, false);

  const cells = favoriteToggleTargets(sections, sectionId, key, true).filter(
    ({ kind }) => {
      return kind === 'cell';
    }
  );

  return [...cells, { kind: 'tab', sectionId: paired }];
};

/**
 * Цели фокуса после «Очистить» недавних: первая избранная GIF.
 *
 * @returns цели по убыванию предпочтения
 */
export const gifClearTargets = (): FocusTarget[] => {
  return [{ kind: 'tab', sectionId: FAVORITE_GIF_SECTION_ID }];
};

/**
 * Ячейка для фокуса по целям и ленте после правки.
 *
 * @param targets — цели по убыванию предпочтения
 * @param sections — разделы ленты после правки
 * @returns ячейка; `null` — ни одной цели не осталось, фокус уходит в поле поиска
 */
export const gifFocusCell = (
  targets: readonly FocusTarget[],
  sections: readonly FocusSection[]
): GifFocusCell | null => {
  const target = resolveFocusTarget(targets, sections);

  if (!target) return null;

  const { kind, sectionId } = target;

  switch (kind) {
    case 'cell': {
      return { sectionId, key: target.key };
    }

    case 'tab': {
      const first = sections.find(({ id }) => {
        return id === sectionId;
      })?.items[0];

      return first ? { sectionId, key: first.key } : null;
    }

    default: {
      const unknownKind: never = kind;

      throw new Error(`Unknown focus target: ${String(unknownKind)}`);
    }
  }
};
