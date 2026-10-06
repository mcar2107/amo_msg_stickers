import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../../i18n/translate';

import type { ImportProgressProps } from './ImportProgress.types';

/**
 * Полоса прогресса импорта и счётчик «обработано/всего» под ней справа: ход импорта виден
 * рядом с полем, а не в строке статуса внизу панели. Ширина — единственное inline-свойство:
 * она меняется на каждый стикер, а классов на каждый процент нет.
 *
 * Скринридер читает счётчик как значение полосы (`aria-valuetext`), сам текст от него скрыт —
 * иначе прочитал бы его дважды.
 */
export const ImportProgress: FC<ImportProgressProps> = (props) => {
  const { done, total } = props;
  const percent = total ? (done / total) * 100 : 0;
  const count = total ? t('add.telegram.progress', { done, total }) : '';

  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={count || undefined}
        className="h-1 overflow-hidden rounded-[2px] bg-cadetGray-30/[.12] dark:bg-white-0/[.06]"
      >
        <div
          className="h-full bg-blue-50 transition-[width] duration-lg ease-[ease] dark:bg-beige-70"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p
        aria-hidden="true"
        className="m-0 self-end text-xs tabular-nums leading-[1.4] text-cadetGray-30 dark:text-gray-70"
      >
        {count}
      </p>
    </div>
  );
};
