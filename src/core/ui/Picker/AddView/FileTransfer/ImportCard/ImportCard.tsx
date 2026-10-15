import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../../i18n/translate';

import {
  fileCardSummary,
  filePackCount,
  filePackTitle,
} from './fileCardText/fileCardText';
import type { ImportCardProps } from './ImportCard.types';

/**
 * Фон и появление — как у карточки пака Telegram: переход из `@starting-style` при монтировании, при уменьшении
 * движения карточка стоит сразу.
 */
const CARD_CLASS = [
  'flex flex-col gap-1.5 rounded-lg bg-cadetGray-30/[.06] px-2.5 py-2 dark:bg-white-0/[.04]',
  'motion-safe:transition-opacity motion-safe:duration-base [@starting-style]:opacity-0',
].join(' ');

const SECONDARY_TEXT_CLASS =
  'm-0 text-xs leading-[1.4] text-cadetGray-30 dark:text-gray-70';

const PRIMARY_TEXT_CLASS = 'text-cadetGray-10 dark:text-gray-90';

const TRACK_CLASS =
  'h-1 overflow-hidden rounded-[2px] bg-cadetGray-30/[.12] dark:bg-white-0/[.06]';

const BAR_CLASS = [
  'h-full bg-blue-50 dark:bg-beige-70',
  'motion-safe:transition-[width] motion-safe:duration-lg motion-safe:ease-[ease]',
].join(' ');

/**
 * Карточка «что добавится» под зоной загрузки: имя файла, паки файла с тем, что импорт с каждым сделает, и итог; во
 * время импорта на месте итога — его ход.
 *
 * Названия паков обрезаются многоточием: длинное название не должно сдвигать счётчик. Список не ограничен по высоте —
 * его прокручивает тело экрана, а «Импорт» остаётся в футере на виду.
 *
 * Счётчик «N/M» проверки скринридер читает значением полосы (`aria-valuetext`), а сам текст от него скрыт — иначе
 * прочитал бы его дважды. Ширина полосы — единственное inline-свойство: она меняется на каждый стикер. Запись хода
 * не сообщает — она идёт одной транзакцией, — поэтому на её время только «Запись…».
 */
export const ImportCard: FC<ImportCardProps> = (props) => {
  const { fileName, card, stage, progress } = props;

  const renderFooter = () => {
    if (!card) return null;

    switch (stage) {
      case null: {
        return (
          <p className={`${SECONDARY_TEXT_CLASS} font-semibold`}>
            {fileCardSummary(card)}
          </p>
        );
      }

      case 'checking': {
        const total = progress?.total || card.newStickerCount;
        const done = progress?.done || 0;
        const count = t('add.file.progress', { done, total });
        const percent = total ? (done / total) * 100 : 0;

        return (
          <>
            <div className="flex items-baseline justify-between gap-2">
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
              className={TRACK_CLASS}
            >
              <div className={BAR_CLASS} style={{ width: `${percent}%` }} />
            </div>
          </>
        );
      }

      case 'writing': {
        return <p className={SECONDARY_TEXT_CLASS}>{t('add.file.writing')}</p>;
      }

      default: {
        const unknownStage: never = stage;

        throw new Error(`Unknown file import stage: ${String(unknownStage)}`);
      }
    }
  };

  return (
    <div aria-busy={card ? undefined : 'true'} className={CARD_CLASS}>
      <p
        className={`m-0 min-w-0 truncate text-xsm font-semibold leading-[1.4] ${PRIMARY_TEXT_CLASS}`}
      >
        {fileName}
      </p>

      {card ? (
        <ul
          aria-label={t('add.file.packs')}
          className="m-0 flex list-none flex-col gap-0.5 p-0"
        >
          {card.packs.map((cardPack) => {
            return (
              <li
                key={cardPack.pack.id}
                className="flex items-baseline justify-between gap-2"
              >
                <span
                  className={`min-w-0 truncate text-xs leading-[1.4] ${PRIMARY_TEXT_CLASS}`}
                >
                  {filePackTitle(cardPack.pack)}
                </span>

                <span className={`${SECONDARY_TEXT_CLASS} shrink-0 tabular-nums`}>
                  {filePackCount(cardPack)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={SECONDARY_TEXT_CLASS}>{t('add.file.reading')}</p>
      )}

      {renderFooter()}
    </div>
  );
};
