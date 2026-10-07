import { t } from '../../../../../../i18n/translate';
import type { PackCard } from '../../../../PickerProvider/packCardView/packCardView.types';

/**
 * Карточка с названием пака: превью до импорта или ход импорта.
 */
type FilledCard = Exclude<
  PackCard,
  {
    /**
     * Заглушка загрузки: названия ещё нет.
     */
    status: 'loading';
  }
>;

/**
 * Число справа от названия пака: до импорта — сколько в паке стикеров, во время импорта на
 * том же месте — «обработано/всего».
 *
 * @param card — карточка с названием пака
 * @returns текст на языке интерфейса
 */
export const packCardCount = (card: FilledCard): string => {
  switch (card.status) {
    case 'preview': {
      return t('add.telegram.count', { total: card.total });
    }

    case 'importing': {
      return t('add.telegram.progress', { done: card.done, total: card.total });
    }

    default: {
      const unknownCard: never = card;

      throw new Error(`Unknown pack card: ${String(unknownCard)}`);
    }
  }
};
