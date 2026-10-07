import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../../i18n/translate';

import { packCardCount } from './packCardCount/packCardCount';
import type { PackCardProps } from './PackCard.types';

/**
 * Появление — переход из `@starting-style` при монтировании карточки; без уменьшения движения
 * она проявляется, с ним — стоит сразу.
 */
const CARD_CLASS = [
  'flex flex-col gap-1 rounded-lg bg-cadetGray-30/[.06] px-2.5 py-2 dark:bg-white-0/[.04]',
  'motion-safe:transition-opacity motion-safe:duration-base [@starting-style]:opacity-0',
].join(' ');

const SECONDARY_TEXT_CLASS =
  'm-0 text-xs leading-[1.4] text-cadetGray-30 dark:text-gray-70';

const SKELETON_CLASS = 'h-3.5 rounded bg-cadetGray-30/[.12] dark:bg-white-0/[.06]';

/**
 * Карточка пака под полем ссылки: название и число стикеров до импорта, ход импорта во время
 * него. Текст карточки — описание поля ссылки, поэтому скринридер читает пак вместе с полем.
 *
 * Пока состав пака загружается, на месте строки — заглушка с `aria-busy` и текстом загрузки,
 * видным только скринридеру. Строка заглушки — `1.4em` кегля названия, как межстрочный интервал
 * строки названия: ответ сдвигает низ карточки меньше чем на пиксель (выравнивание счётчика по
 * базовой линии), если не добавляет пометку «уже в библиотеке».
 *
 * Во время импорта счётчик «N/M» скринридер читает значением полосы (`aria-valuetext`), а сам
 * текст от него скрыт — иначе прочитал бы его дважды. Ширина полосы — единственное
 * inline-свойство: она меняется на каждый стикер, а классов на каждый процент нет.
 */
export const PackCard: FC<PackCardProps> = (props) => {
  const { id, card } = props;

  if (card.status === 'loading') {
    return (
      <div id={id} aria-busy="true" className={CARD_CLASS}>
        <div
          aria-hidden="true"
          className="flex h-[1.4em] items-center justify-between gap-2 text-xsm"
        >
          <div className={`${SKELETON_CLASS} w-1/2`} />

          <div className={`${SKELETON_CLASS} w-16`} />
        </div>

        <span className="sr-only">{t('add.telegram.loading')}</span>
      </div>
    );
  }

  const { title, total } = card;
  const count = packCardCount(card);
  const isImporting = card.status === 'importing';
  const done = isImporting ? card.done : 0;
  const percent = total ? (done / total) * 100 : 0;

  return (
    <div id={id} className={CARD_CLASS}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="m-0 min-w-0 truncate text-xsm font-semibold leading-[1.4] text-cadetGray-10 dark:text-gray-90">
          {title}
        </p>

        <p
          aria-hidden={isImporting || undefined}
          className={`${SECONDARY_TEXT_CLASS} shrink-0 tabular-nums`}
        >
          {count}
        </p>
      </div>

      {card.status === 'preview' && card.isInLibrary && (
        <p className={SECONDARY_TEXT_CLASS}>{t('add.telegram.inLibrary')}</p>
      )}

      {isImporting && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          aria-valuetext={count}
          className="h-1 overflow-hidden rounded-[2px] bg-cadetGray-30/[.12] dark:bg-white-0/[.06]"
        >
          <div
            className="h-full bg-blue-50 transition-[width] duration-lg ease-[ease] dark:bg-beige-70"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
};
