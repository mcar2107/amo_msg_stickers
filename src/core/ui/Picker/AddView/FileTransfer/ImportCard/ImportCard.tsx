import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import { fileCardCheckCount } from '@core/libraryFile';

import { fileCardSummary } from './fileCardText';
import type { ImportCardProps } from './ImportCard.types';
import { PackList } from './PackList';

const SECONDARY_TEXT_CLASS =
  'm-0 text-xs leading-[1.4] text-cadetGray-30 dark:text-gray-70';

const TRACK_CLASS =
  'h-1 overflow-hidden rounded-[2px] bg-cadetGray-30/[.12] dark:bg-white-0/[.06]';

const BAR_CLASS = [
  'h-full bg-blue-50 dark:bg-beige-70',
  'motion-safe:transition-[width] motion-safe:duration-lg motion-safe:ease-[ease]',
].join(' ');

/**
 * Карточка «что добавится» в зоне загрузки, под именем файла: паки файла с тем, что импорт с каждым сделает, и итог;
 * во время импорта на месте итога — его ход.
 *
 * Паки показаны все: пока есть место, зона растёт под список, а не поместившийся в неё список прокручивается внутри
 * карточки (`PackList/`), тело экрана — нет. У файла без паков — только избранное и недавние — списка нет, только итог.
 *
 * Счётчик «N/M» проверки скринридер читает значением полосы (`aria-valuetext`), а сам текст от него скрыт — иначе
 * прочитал бы его дважды. Ширина полосы — единственное inline-свойство: она меняется на каждый стикер. Запись хода
 * не сообщает — она идёт одной транзакцией, — поэтому на её время только «Запись…».
 */
export const ImportCard: FC<ImportCardProps> = (props) => {
  const { card, stage, progress } = props;

  const renderFooter = () => {
    if (!card) return null;

    switch (stage) {
      case null: {
        return fileCardSummary(card).map((line) => {
          return (
            <p key={line} className={`${SECONDARY_TEXT_CLASS} shrink-0 font-semibold`}>
              {line}
            </p>
          );
        });
      }

      case 'checking': {
        const total = progress?.total || fileCardCheckCount(card);
        const done = progress?.done || 0;
        const count = t('add.file.progress', { done, total });
        const percent = total ? (done / total) * 100 : 0;

        return (
          <>
            <div className="flex shrink-0 items-baseline justify-between gap-2">
              <p className={SECONDARY_TEXT_CLASS}>{t('add.file.checking')}</p>

              <p
                aria-hidden="true"
                className={`${SECONDARY_TEXT_CLASS} shrink-0 tabular-nums`}
              >
                {count}
              </p>
            </div>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              aria-valuetext={count}
              className={`${TRACK_CLASS} shrink-0`}
            >
              <div className={BAR_CLASS} style={{ width: `${percent}%` }} />
            </div>
          </>
        );
      }

      case 'writing': {
        return (
          <p className={`${SECONDARY_TEXT_CLASS} shrink-0`}>{t('add.file.writing')}</p>
        );
      }

      default: {
        const unknownStage: never = stage;

        throw new Error(`Unknown file import stage: ${String(unknownStage)}`);
      }
    }
  };

  return (
    <div
      aria-busy={card ? undefined : 'true'}
      className="flex min-h-0 flex-1 flex-col gap-1"
    >
      {!card && <p className={SECONDARY_TEXT_CLASS}>{t('add.file.reading')}</p>}

      {!!card?.packs.length && <PackList packs={card.packs} />}

      {renderFooter()}
    </div>
  );
};
